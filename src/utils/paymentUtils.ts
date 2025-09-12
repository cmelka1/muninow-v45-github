import { PaymentError } from '@/types/payment';

export const classifyPaymentError = (error: any): PaymentError => {
  console.log('🔍 Classifying payment error:', error);
  
  
  // Handle network errors
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    return {
      type: 'network',
      message: 'Network connection failed. Please check your internet connection and try again.',
      retryable: true,
      details: error
    };
  }

  // Handle user cancellation
  if (error?.message?.toLowerCase().includes('user') && 
      (error?.message?.toLowerCase().includes('cancel') || 
       error?.message?.toLowerCase().includes('abort'))) {
    return {
      type: 'user_cancelled',
      message: 'Payment was cancelled by user',
      retryable: false,
      details: error
    };
  }

  // Handle payment declined
  if (error?.status === 402 || 
      error?.message?.toLowerCase().includes('declined') ||
      error?.message?.toLowerCase().includes('insufficient') ||
      error?.code === 'card_declined') {
    return {
      type: 'payment_declined',
      message: error?.message || 'Payment was declined. Please try a different payment method.',
      retryable: false,
      details: error
    };
  }

  // Handle validation errors
  if (error?.status === 400 || 
      error?.message?.toLowerCase().includes('invalid') ||
      error?.message?.toLowerCase().includes('required')) {
    return {
      type: 'validation',
      message: error?.message || 'Invalid payment information. Please check your details.',
      retryable: false,
      details: error
    };
  }

  // Handle configuration errors
  if (error?.status === 500 || 
      error?.message?.toLowerCase().includes('configuration') ||
      error?.message?.toLowerCase().includes('merchant')) {
    return {
      type: 'configuration',
      message: 'Payment system configuration error. Please contact support.',
      retryable: false,
      details: error
    };
  }

  // Handle timeout or temporary errors
  if (error?.status === 408 || error?.status === 503 || error?.status === 504 ||
      error?.name === 'TimeoutError' ||
      error?.message?.toLowerCase().includes('timeout')) {
    return {
      type: 'network',
      message: 'Request timed out. Please try again.',
      retryable: true,
      details: error
    };
  }

  // Handle authentication errors (should be rare in payment context)
  if (error?.status === 401 || error?.status === 403) {
    return {
      type: 'configuration',
      message: 'Authentication failed. Please refresh the page and try again.',
      retryable: true,
      details: error
    };
  }

  // For any other error, classify as unknown but potentially retryable
  return {
    type: 'unknown',
    message: error?.message || 'An unexpected error occurred. Please try again.',
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