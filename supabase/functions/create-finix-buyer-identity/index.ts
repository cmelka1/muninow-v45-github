import { corsHeaders } from '../shared/cors.ts';

interface CreateBuyerIdentityRequest {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
}

Deno.serve(async (req) => {
  console.log('=== CREATE FINIX BUYER IDENTITY REQUEST ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreateBuyerIdentityRequest = await req.json();
    console.log('[create-finix-buyer-identity] Request body:', {
      user_id: body.user_id,
      email: body.email,
      has_address: !!body.address
    });

    // Validate required fields
    if (!body.user_id || !body.email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: user_id, email' 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get Finix credentials from environment
    const finixAppId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixEnv = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';

    if (!finixAppId || !finixApiSecret) {
      console.error('[create-finix-buyer-identity] Missing Finix credentials');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Finix credentials not configured' 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const finixBaseUrl = finixEnv === 'live'
      ? 'https://finix.live-payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    // Prepare Finix identity request for BUYER (PERSONAL type)
    const finixIdentityPayload = {
      entity: {
        email: body.email,
        first_name: body.first_name || 'Guest',
        last_name: body.last_name || 'User',
        phone: body.phone,
        personal_address: body.address ? {
          line1: body.address.line1,
          line2: body.address.line2,
          city: body.address.city,
          region: body.address.region,
          postal_code: body.address.postal_code,
          country: body.address.country || 'USA'
        } : undefined
      },
      identity_roles: ['BUYER'],
      type: 'PERSONAL',
      tags: {
        created_via: 'guest_checkout',
        user_id: body.user_id
      }
    };

    console.log('[create-finix-buyer-identity] Creating BUYER identity with Finix...');

    // Create identity with Finix
    const finixResponse = await fetch(`${finixBaseUrl}/identities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${finixAppId}:${finixApiSecret}`),
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(finixIdentityPayload)
    });

    const finixData = await finixResponse.json();

    if (!finixResponse.ok || !finixData.id) {
      console.error('[create-finix-buyer-identity] Finix API error:', finixData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: finixData._embedded?.errors?.[0]?.message || 'Failed to create Finix identity',
          details: finixData
        }),
        { status: finixResponse.status, headers: corsHeaders }
      );
    }

    const finixIdentityId = finixData.id;
    console.log('[create-finix-buyer-identity] Finix BUYER identity created:', finixIdentityId);

    // Store in finix_identities table
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.5');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: insertError } = await supabase
      .from('finix_identities')
      .insert({
        user_id: body.user_id,
        finix_identity_id: finixIdentityId,
        identity_type: 'BUYER'
      });

    if (insertError) {
      console.error('[create-finix-buyer-identity] Database insert error:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to store identity in database',
          finix_identity_id: finixIdentityId // Return it anyway
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('[create-finix-buyer-identity] Identity stored in database successfully');

    return new Response(
      JSON.stringify({
        success: true,
        identity_id: finixIdentityId,
        user_id: body.user_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-finix-buyer-identity] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
