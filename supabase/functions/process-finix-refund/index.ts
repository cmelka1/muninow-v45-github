import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { FinixAPI } from '../shared/finixAPI.ts';
import { Logger } from '../shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RefundRequest {
  payment_transaction_id: string;
  reason: string;
  refund_amount_cents?: number;
}

interface RefundResponse {
  success: boolean;
  refund_id?: string;
  finix_reversal_id?: string;
  message: string;
  error?: string;
  refund?: {
    refund_status: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { payment_transaction_id, reason, refund_amount_cents }: RefundRequest = await req.json();

    Logger.info('Processing refund request', {
      payment_transaction_id,
      reason,
      refund_amount_cents,
      timestamp: new Date().toISOString()
    });

    if (!payment_transaction_id || !reason) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing payment_transaction_id or reason' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user info from auth token
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Fetch payment transaction record
    const { data: paymentTransaction, error: paymentError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', payment_transaction_id)
      .single();

    if (paymentError || !paymentTransaction) {
      Logger.error('Payment transaction fetch error', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    Logger.info('Payment transaction details', {
      id: paymentTransaction.id,
      total_amount_cents: paymentTransaction.total_amount_cents,
      finix_transfer_id: paymentTransaction.finix_transfer_id,
      payment_status: paymentTransaction.payment_status
    });

    if (!paymentTransaction.finix_transfer_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not eligible for refund (no Finix transfer ID)' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify municipal user permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('account_type, customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.account_type !== 'municipal') {
      return new Response(
        JSON.stringify({ success: false, error: 'Municipal permissions required' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Verify payment belongs to same customer
    if (profile.customer_id !== paymentTransaction.customer_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not accessible by your organization' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Check for duplicate refunds (full refund only)
    const { data: existingRefunds } = await supabase
      .from('refunds')
      .select('id, refund_status, refund_amount_cents')
      .eq('payment_transaction_id', payment_transaction_id)
      .in('refund_status', ['pending', 'completed']);

    if (existingRefunds && existingRefunds.length > 0) {
      const refundStatus = existingRefunds[0].refund_status;
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `A ${refundStatus} refund already exists for this payment. Only one full refund is allowed per transaction.` 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Determine refund amount
    const refundAmount = refund_amount_cents || paymentTransaction.total_amount_cents;

    // Validate refund amount doesn't exceed original payment
    if (refundAmount > paymentTransaction.total_amount_cents) {
      Logger.error('Refund amount exceeds payment amount', {
        refundAmount,
        totalAmount: paymentTransaction.total_amount_cents
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Refund amount ($${(refundAmount/100).toFixed(2)}) cannot exceed original payment amount ($${(paymentTransaction.total_amount_cents/100).toFixed(2)})`
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Call Finix API for refund
    const finixAPI = new FinixAPI();

    Logger.info('Calling Finix API to create reversal', {
      transfer_id: paymentTransaction.finix_transfer_id,
      refund_amount: refundAmount
    });

    // Generate deterministic idempotency key for this refund
    const idempotency_header = `refund-${payment_transaction_id}-${refundAmount}`;
    
    const reversalData = {
          amount: refundAmount,
          tags: {
            payment_transaction_id: payment_transaction_id,
            municipal_user_id: user.id,
            reason: reason
          },
          idempotency_id: idempotency_header
    };

    let finixData;
    try {
        finixData = await finixAPI.createReversal(paymentTransaction.finix_transfer_id, reversalData);
    } catch (finixError) {
        Logger.error('Finix API error', finixError);
        return new Response(
            JSON.stringify({ 
            success: false, 
            error: `Finix API error: ${finixError instanceof Error ? finixError.message : String(finixError)}` 
            }),
            { status: 400, headers: corsHeaders }
        );
    }

    Logger.info('Finix API response', {
      success: true,
      reversal_id: finixData.id,
      state: finixData.state
    });

    // Map Finix state to our status
    const statusMapping: Record<string, string> = {
      'PENDING': 'pending',
      'SUCCEEDED': 'completed',
      'FAILED': 'failed',
      'CANCELED': 'canceled'
    };

    const refundStatus = statusMapping[finixData.state] || 'pending';

    // Insert refund record with comprehensive data
    const { data: refundRecord, error: refundError } = await supabase
      .from('refunds')
      .insert({
        user_id: paymentTransaction.user_id,
        customer_id: paymentTransaction.customer_id,
        municipal_user_id: user.id,
        payment_transaction_id: payment_transaction_id,
        finix_transfer_id: paymentTransaction.finix_transfer_id,
        finix_reversal_id: finixData.id,
        reason: reason,
        refund_amount_cents: refundAmount,
        original_amount_cents: paymentTransaction.total_amount_cents,
        refund_status: refundStatus,
        
        // Payment method details
        card_brand: paymentTransaction.card_brand,
        card_last_four: paymentTransaction.card_last_four,
        bank_last_four: paymentTransaction.bank_last_four,
        payment_type: paymentTransaction.payment_type,
        
        // Merchant and service information
        merchant_name: paymentTransaction.merchant_name,
        category: paymentTransaction.category,
        subcategory: paymentTransaction.subcategory,
        external_account_number: paymentTransaction.external_account_number,
        
        // Service-related dates
        original_issue_date: paymentTransaction.issue_date,
        original_due_date: paymentTransaction.due_date,
        
        // Finix integration
        finix_merchant_id: paymentTransaction.finix_merchant_id,
        finix_payment_instrument_id: paymentTransaction.finix_payment_instrument_id,
        finix_raw_response: finixData,
        
        // Processing timestamps
        processed_at: finixData.state === 'SUCCEEDED' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (refundError) {
      Logger.error('Database insert error', refundError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save refund record' }),
        { status: 500, headers: corsHeaders }
      );
    }

    Logger.info('Refund created successfully', {
      refund_id: refundRecord.id,
      refund_status: refundRecord.refund_status,
      refund_amount_cents: refundRecord.refund_amount_cents,
      finix_reversal_id: refundRecord.finix_reversal_id
    });

    const response: RefundResponse = {
      success: true,
      refund_id: refundRecord.id,
      finix_reversal_id: finixData.id,
      message: `Refund ${refundStatus} - ${finixData.state}`,
      refund: {
        refund_status: refundStatus
      }
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    Logger.error('Process refund error', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});