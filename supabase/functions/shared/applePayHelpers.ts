/**
 * Apple Pay Helper Functions
 * Utilities for validating requests and fetching identity data for Apple Pay payments
 */

interface ApplePayRequestBody {
  entity_type: string;
  entity_id: string;
  merchant_id: string;
  base_amount_cents: number;
  apple_pay_token: string;
  fraud_session_id?: string;
}

export function validateApplePayRequest(body: any): body is ApplePayRequestBody {
  const required = [
    'entity_type',
    'entity_id',
    'merchant_id',
    'base_amount_cents',
    'apple_pay_token'
  ];

  for (const field of required) {
    if (!body[field]) {
      console.error(`[validateApplePayRequest] Missing required field: ${field}`);
      return false;
    }
  }

  if (typeof body.base_amount_cents !== 'number' || body.base_amount_cents <= 0) {
    console.error('[validateApplePayRequest] Invalid base_amount_cents');
    return false;
  }

  return true;
}

export async function fetchUserFinixIdentity(supabase: any, userId: string) {
  console.log('[fetchUserFinixIdentity] Fetching BUYER identity for user:', userId);
  
  const { data, error } = await supabase
    .from('finix_identities')
    .select('finix_identity_id')
    .eq('user_id', userId)
    .eq('identity_type', 'BUYER')
    .single();

  if (error || !data?.finix_identity_id) {
    console.error('[fetchUserFinixIdentity] No BUYER identity found:', error);
    return null;
  }

  console.log('[fetchUserFinixIdentity] Found BUYER identity:', data.finix_identity_id);
  return data.finix_identity_id;
}

export async function fetchMerchantFinixData(supabase: any, merchantId: string) {
  console.log('[fetchMerchantFinixData] Fetching merchant data for:', merchantId);
  
  const { data, error } = await supabase
    .from('merchants')
    .select('finix_merchant_id, finix_identity_id, merchant_name')
    .eq('id', merchantId)
    .single();

  if (error || !data?.finix_merchant_id || !data?.finix_identity_id) {
    console.error('[fetchMerchantFinixData] Merchant lookup failed:', error);
    return null;
  }

  console.log('[fetchMerchantFinixData] Merchant data retrieved:', {
    name: data.merchant_name,
    finix_merchant_id: data.finix_merchant_id,
    finix_identity_id: data.finix_identity_id
  });

  return {
    finixMerchantId: data.finix_merchant_id,
    finixIdentityId: data.finix_identity_id,
    merchantName: data.merchant_name
  };
}

export interface BillingAddress {
  address1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export function formatApplePayBillingAddress(token: any): BillingAddress {
  const billingContact = token.billingContact || {};
  
  return {
    address1: billingContact.addressLines?.[0] || '',
    city: billingContact.locality || '',
    state: billingContact.administrativeArea || '',
    postal_code: billingContact.postalCode || '',
    email: billingContact.emailAddress || '',
    first_name: billingContact.givenName || '',
    last_name: billingContact.familyName || '',
    phone: billingContact.phoneNumber || ''
  };
}
