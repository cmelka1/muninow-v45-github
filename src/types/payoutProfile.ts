export type PayoutType = 'GROSS' | 'NET';
export type PayoutFrequency = 'DAILY' | 'MONTHLY' | 'CONTINUOUS';
export type PayoutRail = 'NEXT_DAY_ACH' | 'SAME_DAY_ACH';
export type SyncStatus = 'synced' | 'pending' | 'error';

export interface PayoutProfile {
  id: string;
  merchant_id: string;
  finix_payout_profile_id?: string;
  type: PayoutType;
  sync_status: SyncStatus;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
  
  // NET type fields
  net_frequency?: PayoutFrequency;
  net_submission_delay_days?: number;
  net_payment_instrument_id?: string;
  net_rail?: PayoutRail;
  
  // GROSS type fields
  gross_payouts_frequency?: PayoutFrequency;
  gross_payouts_submission_delay_days?: number;
  gross_payouts_payment_instrument_id?: string;
  gross_payouts_rail?: PayoutRail;
  gross_fees_frequency?: PayoutFrequency;
  gross_fees_day_of_month?: number;
  gross_fees_submission_delay_days?: number;
  gross_fees_payment_instrument_id?: string;
  gross_fees_rail?: PayoutRail;
}

export interface PayoutProfileFormData {
  type: PayoutType;
  
  // NET fields
  net_frequency?: PayoutFrequency;
  net_submission_delay_days?: number;
  net_payment_instrument_id?: string;
  net_rail?: PayoutRail;
  
  // GROSS fields
  gross_payouts_frequency?: PayoutFrequency;
  gross_payouts_submission_delay_days?: number;
  gross_payouts_payment_instrument_id?: string;
  gross_payouts_rail?: PayoutRail;
  gross_fees_frequency?: PayoutFrequency;
  gross_fees_submission_delay_days?: number;
  gross_fees_payment_instrument_id?: string;
  gross_fees_rail?: PayoutRail;
}