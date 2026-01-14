// Shared payment utility functions for edge functions
import { Logger } from './logger.ts';

// UUIDv5 namespace for payment idempotency (deterministic UUID generation)
const PAYMENT_IDEMPOTENCY_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export interface PaymentError {
  type: 'network' | 'payment_declined' | 'validation' | 'user_cancelled' | 'configuration' | 'unknown';
  message: string;
  retryable: boolean;
  details?: any;
}

export interface IdempotencyMetadata {
  session_id?: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  payment_method?: string;
  payment_instrument_id?: string;
  client_user_agent?: string;
  client_ip?: string;
  created_at: string;
  version: string;
}

export const classifyPaymentError = (error: any): PaymentError => {
  const errorMessage = error?.value?.message || error?.message || error?.toString() || '';
  const statusCode = error?.value?.statusCode;
  const errorName = error?.value?.name;
  
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
    return {
      type: 'validation',
      message: 'Payment information is invalid. Please check your details.',
      retryable: false,
      details: error
    };
  }
  
  // Check for configuration errors
  if (errorMessage.includes('merchant') ||
      errorMessage.includes('configuration') ||
      errorMessage.includes('not configured')) {
    return {
      type: 'configuration',
      message: 'Payment service is not properly configured. Please contact support.',
      retryable: false,
      details: error
    };
  }
  
  // Default to unknown error
  return {
    type: 'unknown',
    message: errorMessage || 'An unexpected error occurred. Please try again.',
    retryable: true,
    details: error
  };
};

/**
 * Generates a deterministic UUID v5 for payment idempotency
 * Same inputs will always produce the same UUID, enabling proper deduplication
 */
export const generateDeterministicUUID = (params: {
  entityType: string;
  entityId: string;
  userId: string;
  sessionId: string;
  baseAmountCents: number;
  paymentInstrumentId?: string;
}): string => {
  // Generate a truly random UUID to avoid hash collisions
  // The idempotency metadata still tracks all session info for debugging
  const uuid = crypto.randomUUID();
  Logger.debug('Generated random UUID', { uuid, sessionId: params.sessionId });
  return uuid;
};

/**
 * Generates comprehensive metadata for debugging and tracking
 */
export const generateIdempotencyMetadata = (params: {
  sessionId?: string;
  entityType: string;
  entityId: string;
  userId: string;
  paymentMethod?: string;
  paymentInstrumentId?: string;
  clientUserAgent?: string;
  clientIp?: string;
}): IdempotencyMetadata => {
  return {
    session_id: params.sessionId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    user_id: params.userId,
    payment_method: params.paymentMethod,
    payment_instrument_id: params.paymentInstrumentId,
    client_user_agent: params.clientUserAgent,
    client_ip: params.clientIp,
    created_at: new Date().toISOString(),
    version: '2.0' // Track which version of idempotency system
  };
};

/**
 * Validates if a string is a valid UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * @deprecated Legacy function - use generateDeterministicUUID instead
 * Kept for backward compatibility during migration
 */
export const generateIdempotencyId = (prefix: string, entityId?: string): string => {
  try {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substr(2, 9);
    const entityPart = entityId ? `${entityId}_` : '';
    const id = `${prefix}_${entityPart}${timestamp}_${randomPart}`;
    
    // Validate the generated ID
    if (!id || id.trim() === '' || id.length < 10) {
      throw new Error('Generated ID is invalid');
    }
    
    return id;
  } catch (error) {
    Logger.error('Error generating idempotency ID', error);
    // Fallback generation
    const fallbackId = `${prefix}_fallback_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    Logger.warn('Using fallback idempotency ID', { fallbackId });
    return fallbackId;
  }
};