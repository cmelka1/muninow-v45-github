import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RefundRequest {
  payment_history_id: string;
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
    const { payment_history_id, reason, refund_amount_cents }: RefundRequest = await req.json();

    if (!payment_history_id || !reason) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing payment_history_id or reason' }),
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

    // Fetch payment history record
    const { data: paymentHistory, error: paymentError } = await supabase
      .from('payment_history')
      .select('*')
      .eq('id', payment_history_id)
      .single();

    if (paymentError || !paymentHistory) {
      console.error('Payment history fetch error:', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!paymentHistory.finix_transfer_id) {
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
    if (profile.customer_id !== paymentHistory.customer_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not accessible by your organization' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Check for duplicate refunds
    const { data: existingRefund } = await supabase
      .from('refunds')
      .select('id')
      .eq('payment_history_id', payment_history_id)
      .single();

    if (existingRefund) {
      return new Response(
        JSON.stringify({ success: false, error: 'Refund already exists for this payment' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Determine refund amount
    const refundAmount = refund_amount_cents || paymentHistory.total_amount_cents;

    // Call Finix API for refund
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    
    if (!finixApplicationId || !finixApiSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Finix credentials not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const finixApiUrl = finixEnvironment === 'production' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    const finixCredentials = btoa(`${finixApplicationId}:${finixApiSecret}`);

    const finixResponse = await fetch(
      `${finixApiUrl}/transfers/${paymentHistory.finix_transfer_id}/reversals`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${finixCredentials}`,
          'Content-Type': 'application/vnd.json+api',
          'Finix-Version': '2022-02-01',
        },
        body: JSON.stringify({
          refund_amount: refundAmount,
          tags: {
            payment_history_id: payment_history_id,
            municipal_user_id: user.id,
            reason: reason
          }
        })
      }
    );

    const finixData = await finixResponse.json();

    if (!finixResponse.ok) {
      console.error('Finix API error:', finixData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Finix API error: ${finixData.message || 'Unknown error'}` 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Finix refund response:', finixData);

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
        bill_id: paymentHistory.bill_id,
        user_id: paymentHistory.user_id,
        municipal_user_id: user.id,
        payment_history_id: payment_history_id,
        finix_transfer_id: paymentHistory.finix_transfer_id,
        finix_reversal_id: finixData.id,
        reason: reason,
        refund_amount_cents: refundAmount,
        original_amount_cents: paymentHistory.amount_cents,
        refund_status: refundStatus,
        
        // Payment method details
        card_brand: paymentHistory.card_brand,
        card_last_four: paymentHistory.card_last_four,
        bank_last_four: paymentHistory.bank_last_four,
        payment_type: paymentHistory.payment_type,
        
        // Merchant and bill information
        merchant_name: paymentHistory.merchant_name,
        category: paymentHistory.category,
        subcategory: paymentHistory.subcategory,
        external_account_number: paymentHistory.external_account_number,
        external_bill_number: paymentHistory.external_bill_number,
        
        // Original bill dates
        original_issue_date: paymentHistory.issue_date,
        original_due_date: paymentHistory.due_date,
        
        // Finix integration
        finix_merchant_id: paymentHistory.finix_merchant_id,
        finix_payment_instrument_id: paymentHistory.finix_payment_instrument_id,
        finix_raw_response: finixData,
        
        // Processing timestamps
        processed_at: finixData.state === 'SUCCEEDED' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (refundError) {
      console.error('Database insert error:', refundError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save refund record' }),
        { status: 500, headers: corsHeaders }
      );
    }

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
    console.error('Process refund error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});