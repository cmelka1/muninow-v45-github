import { 
  FinixConfig, 
  FinixPaymentInstrumentParams, 
  FinixTransferParams, 
  FinixTransfer,
  FinixIdentity,
  FinixMerchant,
  FinixFeeProfile,
  FinixIdentityParams
} from './types/finix.ts';
import { ServiceResponse } from './types/common.ts';
import { Logger } from './logger.ts';

export class FinixAPI {
  private config: FinixConfig;

  constructor() {
    const environment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    this.config = {
      username: Deno.env.get('FINIX_APPLICATION_ID') ?? '',
      password: Deno.env.get('FINIX_API_SECRET') ?? '',
      baseUrl: environment === 'production' 
        ? 'https://finix.payments-api.com'
        : 'https://finix.sandbox-payments-api.com'
    };

    if (!this.config.username || !this.config.password) {
      throw new Error('Finix credentials not configured');
    }
  }

  // Create payment instrument from Google Pay token
  async createPaymentInstrument(params: FinixPaymentInstrumentParams): Promise<ServiceResponse<{
    id: string;
    card_brand?: string;
    last_four?: string;
    masked_account_number?: string;
    bank_code?: string;
    account_type?: string;
    name?: string;
    fingerprint?: string;
    created_at: string;
    updated_at: string;
    expiration_month?: number;
    expiration_year?: number;
    links?: any;
    instrument_type?: string;
    bank_account_validation_check?: string;
  }>> {
    try {
      const endpoint = `${this.config.baseUrl}/payment_instruments`;
      
      const body: any = {
        identity: params.identity,
        type: params.type,
      };

      if (params.billingAddress) {
        body.address = params.billingAddress;
      }
      
      if (params.tags) {
        body.tags = params.tags;
      }

      if (params.merchantIdentity) {
        body.merchant_identity = params.merchantIdentity;
      }

      if (params.type === 'GOOGLE_PAY') {
        body.third_party_token = params.googlePayToken;
      } else if (params.type === 'APPLE_PAY') {
        body.third_party_token = params.applePayToken;
      } else if (params.type === 'TOKEN') {
        body.token = params.token;
      } else if (params.type === 'BANK_ACCOUNT' && params.bankDetails) {
        body.account_type = params.bankDetails.account_type;
        body.bank_code = params.bankDetails.bank_code;
        body.account_number = params.bankDetails.account_number;
        
        if (params.bankDetails.name) {
            body.name = params.bankDetails.name;
        }
      }

      if (params.bankAccountValidationCheck) {
        body.attempt_bank_account_validation_check = true;
      }

      Logger.info('[FinixAPI] Creating payment instrument', { type: params.type });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
          'Content-Type': 'application/json',
          'Finix-Version': '2022-02-01'
        },
        body: JSON.stringify(body)
      });

      const instrument = await response.json();

      if (!response.ok) {
        Logger.error('[FinixAPI] Payment instrument creation failed', instrument);
        return {
          success: false,
          error: instrument.message || 'Failed to create payment instrument'
        };
      }

      // DEBUG: Log the raw Finix response to understand the structure
      Logger.info('[FinixAPI] Payment instrument created - RAW RESPONSE', { 
        id: instrument.id,
        type: instrument.type,
        card: instrument.card,
        brand: instrument.brand,
        last_four: instrument.last_four,
        masked_account_number: instrument.masked_account_number,
        all_keys: Object.keys(instrument),
        raw: JSON.stringify(instrument)
      });

      // Extract card details with multiple fallback paths
      // Finix may return data under .card or directly on the instrument
      const cardBrand = instrument.card?.brand || instrument.brand || null;
      const cardLastFour = instrument.card?.last_four || instrument.last_four || instrument.masked_account_number?.slice(-4) || null;
      const cardExpMonth = instrument.card?.expiration_month || instrument.expiration_month || null;
      const cardExpYear = instrument.card?.expiration_year || instrument.expiration_year || null;
      
      Logger.info('[FinixAPI] Extracted card details', { cardBrand, cardLastFour, cardExpMonth, cardExpYear });

      return {
        success: true,
        data: {
          id: instrument.id,
          card_brand: cardBrand,
          last_four: cardLastFour,
          masked_account_number: instrument.masked_account_number,
          bank_code: instrument.bank_code,
          account_type: instrument.account_type,
          name: instrument.name,
          fingerprint: instrument.fingerprint,
          created_at: instrument.created_at,
          updated_at: instrument.updated_at,
          expiration_month: cardExpMonth,
          expiration_year: cardExpYear,
          instrument_type: instrument.type,
          bank_account_validation_check: instrument.bank_account_validation_check,
          links: instrument._links
        }
      };
      
    } catch (error) {
      Logger.error('[FinixAPI] Error in createPaymentInstrument', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create transfer (execute payment)
  async createTransfer(params: FinixTransferParams): Promise<ServiceResponse<FinixTransfer>> {
    try {
      const endpoint = `${this.config.baseUrl}/transfers`;

      const body: any = {
        amount: params.amount,
        currency: params.currency,
        merchant: params.merchant,
        source: params.source,
        tags: params.tags || {},
        idempotency_id: params.idempotency_id
      };

      if (params.fraud_session_id) {
        body.fraud_session_id = params.fraud_session_id;
      }

      Logger.info('[FinixAPI] Creating transfer', {
        amount: params.amount,
        merchant: params.merchant,
        idempotency_id: params.idempotency_id
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
          'Content-Type': 'application/json',
          'Finix-Version': '2022-02-01'
        },
        body: JSON.stringify(body)
      });

      const transfer = await response.json();

      if (!response.ok) {
        Logger.error('[FinixAPI] Transfer failed', transfer);
        return {
          success: false,
          error: transfer.message || 'Transfer failed',
          raw_response: transfer
        };
      }

      Logger.info('[FinixAPI] Transfer created successfully', { id: transfer.id });

      return {
        success: true,
        data: {
            id: transfer.id,
            created_at: transfer.created_at,
            updated_at: transfer.updated_at,
            amount: transfer.amount,
            currency: transfer.currency,
            state: transfer.state,
            merchant: transfer.merchant,
            source: transfer.source,
            trace_id: transfer.trace_id,
        },
        raw_response: transfer
      };
      
    } catch (error) {
      Logger.error('[FinixAPI] Error in createTransfer', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create Apple Pay Session
  async createApplePaySession(params: {
    displayName: string;
    domain: string;
    merchantIdentity: string;
    validationUrl: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const endpoint = `${this.config.baseUrl}/apple_pay_sessions`;
      
      const body = {
        display_name: params.displayName,
        domain: params.domain,
        merchant_identity: params.merchantIdentity,
        validation_url: params.validationUrl
      };

      Logger.info('[FinixAPI] Creating Apple Pay session', { 
        domain: params.domain,
        merchant: params.merchantIdentity 
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
          'Content-Type': 'application/json',
          'Finix-Version': '2022-02-01'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        Logger.error('[FinixAPI] Apple Pay session failed', data);
        return {
          success: false,
          error: data.message || 'Failed to create Apple Pay session',
          raw_response: data
        };
      }

      Logger.info('[FinixAPI] Apple Pay session created successfully');

      return {
        success: true,
        data: data.session_details,
        raw_response: data
      };

    } catch (error) {
      Logger.error('[FinixAPI] Error in createApplePaySession', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create Identity
  async createIdentity(data: FinixIdentityParams): Promise<FinixIdentity> {
    const endpoint = `${this.config.baseUrl}/identities`;
    Logger.info('[FinixAPI] Creating identity');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      Logger.error('[FinixAPI] Identity creation failed', result);
      throw new Error(result.message || 'Failed to create identity');
    }
    return result;
  }

  // Fee Profiles
  async createFeeProfile(data: Partial<FinixFeeProfile>): Promise<FinixFeeProfile> {
    const endpoint = `${this.config.baseUrl}/fee_profiles`;
    Logger.info('[FinixAPI] Creating fee profile');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      Logger.error('[FinixAPI] Fee profile creation failed', result);
      throw new Error(result.message || 'Failed to create fee profile');
    }
    return result;
  }

  async updateFeeProfile(id: string, data: Partial<FinixFeeProfile>): Promise<FinixFeeProfile> {
    const endpoint = `${this.config.baseUrl}/fee_profiles/${id}`;
    Logger.info('[FinixAPI] Updating fee profile', { id });

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      Logger.error('[FinixAPI] Fee profile update failed', result);
      throw new Error(result.message || 'Failed to update fee profile');
    }
    return result;
  }

  // Payout Profiles
  async getPayoutProfile(merchantId: string): Promise<any> {
    const endpoint = `${this.config.baseUrl}/merchants/${merchantId}/payout_profile`;
    Logger.info('[FinixAPI] Fetching payout profile for merchant', { merchantId });

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      }
    });

    if (response.status === 404) {
      return null;
    }

    const result = await response.json();
    if (!response.ok) {
      Logger.error('[FinixAPI] Fetch payout profile failed', result);
      throw new Error(result.message || 'Failed to fetch payout profile');
    }
    return result;
  }

  async createPayoutProfile(merchantId: string, data: any): Promise<any> {
    const endpoint = `${this.config.baseUrl}/merchants/${merchantId}/payout_profiles`;
    Logger.info('[FinixAPI] Creating payout profile for merchant', { merchantId });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      Logger.error('[FinixAPI] Payout profile creation failed', result);
      throw new Error(result.message || 'Failed to create payout profile');
    }
    return result;
  }

  async updatePayoutProfile(id: string, data: any): Promise<any> {
    const endpoint = `${this.config.baseUrl}/payout_profiles/${id}`;
    Logger.info('[FinixAPI] Updating payout profile', { id });

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      Logger.error('[FinixAPI] Payout profile update failed', result);
      throw new Error(result.message || 'Failed to update payout profile');
    }
    return result;
  }

  // Merchant Methods
  async createMerchant(identityId: string, data: Partial<FinixMerchant>): Promise<FinixMerchant> {
    const endpoint = `${this.config.baseUrl}/identities/${identityId}/merchants`;
    Logger.info('[FinixAPI] Creating merchant for identity', { identityId });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      Logger.error('[FinixAPI] Merchant creation failed', result);
      throw new Error(result.message || 'Failed to create merchant');
    }
    return result;
  }

  async updateMerchantProfile(id: string, data: Partial<FinixMerchant>): Promise<FinixMerchant> {
    const endpoint = `${this.config.baseUrl}/merchant_profiles/${id}`;
    Logger.info('[FinixAPI] Updating merchant profile', { id });

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      Logger.error('[FinixAPI] Merchant profile update failed', result);
      throw new Error(result.message || 'Failed to update merchant profile');
    }
    return result;
  }

  async deleteFeeProfile(id: string): Promise<void> {
    const endpoint = `${this.config.baseUrl}/fee_profiles/${id}`;
    Logger.info('[FinixAPI] Deleting fee profile', { id });

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
        'Finix-Version': '2022-02-01'
      }
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      Logger.error('[FinixAPI] Fee profile deletion failed', result);
      throw new Error(result.message || 'Failed to delete fee profile');
    }
  }

  // Refunding / Reversals
  async createReversal(transferId: string, data: any): Promise<any> {
    const endpoint = `${this.config.baseUrl}/transfers/${transferId}/reversals`;
    Logger.info('[FinixAPI] Creating reversal for transfer', { transferId });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (!response.ok) {
      Logger.error('[FinixAPI] Reversal creation failed', result);
      throw new Error(result.message || 'Failed to create reversal');
    }
    return result;
  }
}
