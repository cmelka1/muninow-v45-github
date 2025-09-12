import { PaymentError } from '@/types/payment';

export const classifyPaymentError = (error: any): PaymentError => {
  // Enhanced logging for error classification
  console.group('🔍 PAYMENT_ERROR_CLASSIFICATION');
  console.log('Raw error object:', error);
  console.log('Error structure analysis:', {
    hasValue: !!error?.value,
    hasMessage: !!error?.message,
    hasStringRepresentation: !!error?.toString,
    errorKeys: Object.keys(error || {}),
    valueKeys: error?.value ? Object.keys(error.value) : 'N/A'
  });

  const errorMessage = error?.value?.message || error?.message || error?.toString() || '';
  const statusCode = error?.value?.statusCode;
  const errorName = error?.value?.name;
  
  console.log('Extracted values:', { errorMessage, statusCode, errorName });
  
  // Check for user cancellation
  const isUserCancellation = statusCode === 'CANCELED' ||
                            errorName === 'AbortError' ||
                            errorMessage.includes('CANCELED') || 
                            errorMessage.includes('canceled') || 
                            errorMessage.includes('cancelled') ||
                            errorMessage.includes('User canceled') ||
                            errorMessage.includes('User closed the Payment Request UI') ||
                            errorMessage.includes('AbortError') ||
                            errorMessage.includes('Payment request was aborted');
  
  if (isUserCancellation) {
    console.log('✅ Classified as: USER_CANCELLED');
    console.groupEnd();
    return {
      type: 'user_cancelled',
      message: 'Payment was cancelled by user',
      retryable: true,
      details: error
    };
  }
  
  // Check for network errors
  if (errorMessage.includes('network') || 
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      error?.code === 'NETWORK_ERROR') {
    console.log('✅ Classified as: NETWORK_ERROR');
    console.groupEnd();
    return {
      type: 'network',
      message: 'Network error occurred. Please check your connection and try again.',
      retryable: true,
      details: error
    };
  }
  
  // Check for payment declined
  if (errorMessage.includes('declined') || 
      errorMessage.includes('insufficient') ||
      errorMessage.includes('invalid card') ||
      statusCode === 'PAYMENT_DECLINED') {
    console.log('✅ Classified as: PAYMENT_DECLINED');
    console.groupEnd();
    return {
      type: 'payment_declined',
      message: 'Payment was declined. Please check your payment method and try again.',
      retryable: false,
      details: error
    };
  }
  
  // Check for validation errors
  if (errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('required') ||
      statusCode === 'VALIDATION_ERROR') {
    console.log('✅ Classified as: VALIDATION_ERROR');
    console.groupEnd();
    return {
      type: 'validation',
      message: 'Payment information is invalid. Please check your details.',
      retryable: false,
      details: error
    };
  }
  
  // Check for Google Pay merchant identity mismatch
  if (errorMessage.includes('Google Pay token must be associated with the merchant_identity provided')) {
    console.log('✅ Classified as: GOOGLE_PAY_MERCHANT_MISMATCH');
    console.groupEnd();
    return {
      type: 'configuration',
      message: 'Google Pay is not available for this merchant. Please try a different payment method.',
      retryable: false,
      details: error
    };
  }
  
  // Check for configuration errors
  if (errorMessage.includes('merchant') ||
      errorMessage.includes('configuration') ||
      errorMessage.includes('not configured')) {
    console.log('✅ Classified as: CONFIGURATION_ERROR');
    console.groupEnd();
    return {
      type: 'configuration',
      message: 'Payment service is not properly configured. Please contact support.',
      retryable: false,
      details: error
    };
  }
  
  // Default to unknown error
  console.log('⚠️ Classified as: UNKNOWN_ERROR');
  console.groupEnd();
  return {
    type: 'unknown',
    message: errorMessage || 'An unexpected error occurred. Please try again.',
    retryable: true,
    details: error
  };
};

export const generateIdempotencyId = (prefix: string, billId?: string): string => {
  try {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substr(2, 9);
    const billPart = billId ? `${billId}_` : '';
    const id = `${prefix}_${billPart}${timestamp}_${randomPart}`;
    
    // Validate the generated ID
    if (!id || id.trim() === '' || id.length < 10) {
      throw new Error('Generated ID is invalid');
    }
    
    return id;
  } catch (error) {
    console.error('Error generating idempotency ID:', error);
    // Fallback generation
    const fallbackId = `${prefix}_fallback_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    console.warn('Using fallback idempotency ID:', fallbackId);
    return fallbackId;
  }
};

export const initializeApplePaySession = async (
  merchantId: string,
  totalAmount: number,
  merchantName: string,
  onValidateMerchant: (event: any) => Promise<any>,
  onPaymentAuthorized: (event: any) => Promise<any>
): Promise<any> => {
  if (!window.ApplePaySession) {
    throw new Error('Apple Pay is not available on this device');
  }

  if (!window.ApplePaySession.canMakePayments()) {
    throw new Error('Apple Pay is not available on this device');
  }

  const paymentRequest = {
    countryCode: 'US',
    currencyCode: 'USD',
    supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
    merchantCapabilities: ['supports3DS'],
    total: {
      label: merchantName,
      amount: (totalAmount / 100).toFixed(2),
      type: 'final'
    }
  };

  const session = new window.ApplePaySession(3, paymentRequest);

  session.onvalidatemerchant = onValidateMerchant;
  session.onpaymentauthorized = onPaymentAuthorized;
  
  session.oncancel = () => {
    console.log('Apple Pay session was cancelled by user');
  };

  return session;
};