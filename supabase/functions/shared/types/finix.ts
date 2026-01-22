import { Address } from './common.ts';

export interface FinixConfig {
  username: string;
  password: string;
  baseUrl: string;
}

export interface FinixBankDetails {
  account_type?: string;
  bank_code?: string;
  account_number?: string;
  name?: string;
}

export interface FinixPaymentInstrumentParams {
  type: 'GOOGLE_PAY' | 'APPLE_PAY' | 'TOKEN' | 'BANK_ACCOUNT' | 'PAYMENT_CARD';
  identity: string;
  merchantIdentity?: string;
  googlePayToken?: any;
  applePayToken?: any;
  token?: string;
  billingAddress?: Address;
  bankAccountValidationCheck?: boolean;
  tags?: Record<string, string>;
  bankDetails?: FinixBankDetails;
}

export interface FinixPaymentInstrument {
  id: string;
  created_at: string;
  updated_at: string;
  type: string;
  payload?: any;
  // Card details
  card?: {
    brand: string;
    last_four: string;
    expiration_month: number;
    expiration_year: number;
  };
  // Bank details
  masked_account_number?: string;
  bank_code?: string;
  account_type?: string;
  name?: string;
  fingerprint?: string;
  bank_account_validation_check?: string;
  _links?: any;
}

export interface FinixTransferParams {
  amount: number;
  currency: string;
  merchant: string;
  source: string;
  tags?: Record<string, string>;
  idempotency_id: string;
  fraud_session_id?: string;
}

export interface FinixTransfer {
  id: string;
  created_at: string;
  updated_at: string;
  amount: number;
  currency: string;
  state: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  merchant: string;
  source: string;
  trace_id?: string;
  raw_response?: any;
}

// Identity & Merchant
export interface FinixIdentity {
  id: string;
  created_at: string;
  updated_at: string;
  tags?: Record<string, string>;
  entity_type?: string;
}

export interface FinixMerchant {
  id: string;
  created_at: string;
  updated_at: string;
  identity: string;
  merchant_profile?: string;
  processing_enabled: boolean;
  settlement_enabled: boolean;
  onboarding_state?: 'PROVISIONING' | 'APPROVED' | 'REJECTED' | 'UPDATE_REQUESTED';
  verification?: string;
  application?: string;
  mcc?: string;
  mid?: string;
}


export interface FinixFeeProfile {
  id: string;
  usage: string;
  fixed_amount: number;
  variable_rate: number;
}
export interface FinixIdentityParams {
  additional_underwriting_data?: {
    annual_ach_volume?: number;
    average_ach_transfer_amount?: number;
    average_card_transfer_amount?: number;
    business_description?: string;
    card_volume_distribution?: {
      card_present_percentage: number;
      mail_order_telephone_order_percentage: number;
      ecommerce_percentage: number;
    };
    credit_check_allowed?: boolean;
    credit_check_ip_address?: string;
    credit_check_timestamp?: string;
    credit_check_user_agent?: string;
    merchant_agreement_accepted?: boolean;
    merchant_agreement_ip_address?: string;
    merchant_agreement_timestamp?: string;
    merchant_agreement_user_agent?: string;
    refund_policy?: string;
    volume_distribution_by_business_type?: {
      other_volume_percentage: number;
      consumer_to_consumer_volume_percentage: number;
      business_to_consumer_volume_percentage: number;
      business_to_business_volume_percentage: number;
      person_to_person_volume_percentage: number;
    };
  };
  entity: {
    annual_card_volume?: number;
    business_address?: Address;
    business_name?: string;
    business_phone?: string;
    business_tax_id?: string;
    business_type?: string;
    default_statement_descriptor?: string;
    dob?: { year: number; month: number; day: number } | null;
    doing_business_as?: string;
    email?: string;
    first_name?: string;
    has_accepted_credit_cards_previously?: boolean;
    incorporation_date?: { year: number; month: number; day: number } | null;
    last_name?: string;
    max_transaction_amount?: number;
    ach_max_transaction_amount?: number;
    mcc?: string;
    ownership_type?: string;
    personal_address?: Address;
    phone?: string;
    principal_percentage_ownership?: number;
    tax_id?: string;
    title?: string;
    url?: string | null;
  };
  identity_roles?: string[];
  tags?: Record<string, string>;
  type?: 'BUSINESS' | 'PERSON';
}

export interface FinixWebhookEvent {
  id: string;
  type: string; // e.g., 'created', 'updated'
  entity: string; // e.g., 'transfer', 'merchant'
  occurred_at: string;
  _embedded: {
    transfers?: FinixTransfer[];
    merchants?: FinixMerchant[];
    [key: string]: any;
  };
}
