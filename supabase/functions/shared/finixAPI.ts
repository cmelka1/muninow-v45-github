// Finix API wrapper - handles all Finix interactions
interface FinixConfig {
  username: string;
  password: string;
  baseUrl: string;
}

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
  async createPaymentInstrument(params: {
    type: 'GOOGLE_PAY' | 'APPLE_PAY';
    identity: string;
    merchantIdentity: string;
    googlePayToken?: any;
    applePayToken?: any;
    billingAddress?: any;
  }): Promise<{
    success: boolean;
    id?: string;
    card_brand?: string;
    last_four?: string;
    error?: string;
  }> {
    try {
      const endpoint = `${this.config.baseUrl}/payment_instruments`;
      
      const body = {
        identity: params.identity,
        merchant_identity: params.merchantIdentity,
        type: params.type,
        third_party_token: params.type === 'GOOGLE_PAY' ? params.googlePayToken : params.applePayToken,
        address: params.billingAddress
      };

      console.log('[FinixAPI] Creating payment instrument:', { type: params.type });

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
        console.error('[FinixAPI] Payment instrument creation failed:', instrument);
        return {
          success: false,
          error: instrument.message || 'Failed to create payment instrument'
        };
      }

      console.log('[FinixAPI] Payment instrument created successfully:', instrument.id);

      return {
        success: true,
        id: instrument.id,
        card_brand: instrument.card?.brand,
        last_four: instrument.card?.last_four
      };
      
    } catch (error) {
      console.error('[FinixAPI] Error in createPaymentInstrument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create transfer (execute payment)
  async createTransfer(params: {
    amount: number;
    currency: string;
    merchant: string;
    source: string;
    tags?: Record<string, string>;
    idempotency_id: string;
    fraud_session_id?: string;
  }): Promise<{
    success: boolean;
    transfer_id?: string;
    state?: string;
    error?: string;
    raw_response?: any;
  }> {
    try {
      const endpoint = `${this.config.baseUrl}/transfers`;

      const body: any = {
        amount: params.amount,
        currency: params.currency,
        merchant: params.merchant,
        source: params.source,
        tags: params.tags || {}
      };

      if (params.fraud_session_id) {
        body.fraud_session_id = params.fraud_session_id;
      }

      console.log('[FinixAPI] Creating transfer:', {
        amount: params.amount,
        merchant: params.merchant,
        idempotency_id: params.idempotency_id
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`),
          'Content-Type': 'application/json',
          'Finix-Version': '2022-02-01',
          'Idempotency-ID': params.idempotency_id
        },
        body: JSON.stringify(body)
      });

      const transfer = await response.json();

      if (!response.ok) {
        console.error('[FinixAPI] Transfer failed:', transfer);
        return {
          success: false,
          error: transfer.message || 'Transfer failed',
          raw_response: transfer
        };
      }

      console.log('[FinixAPI] Transfer created successfully:', transfer.id);

      return {
        success: true,
        transfer_id: transfer.id,
        state: transfer.state,
        raw_response: transfer
      };
      
    } catch (error) {
      console.error('[FinixAPI] Error in createTransfer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
