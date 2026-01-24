import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FinixAPI } from '../shared/finixAPI.ts';
import { Logger } from '../shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity, accountType, businessId } = await req.json();

    if (!entity || !entity.email) {
      throw new Error('Missing required entity fields');
    }

    Logger.info('Creating Finix identity', { email: entity.email, accountType });

    // Initialize Finix API
    const finixAPI = new FinixAPI();

    // Construct the payload for Finix
    // Note: SignupForm sends a simplified object. We map it to Finix requirements.
    const finixPayload = {
      entity: {
        email: entity.email,
        phone: entity.phone,
        first_name: entity.first_name,
        last_name: entity.last_name,
        personal_address: entity.personal_address || undefined,
        // Add default business values if this is a business account
        ...(accountType === 'business' ? {
            business_name: entity.business_name || `${entity.first_name} ${entity.last_name}`,
            business_type: 'LLC', // Default or need to capture field
            business_phone: entity.phone,
            business_address: entity.personal_address // Using personal address as fallback if business addr missing
        } : {})
      },
      tags: {
        source: 'muninow_signup',
        account_type: accountType || 'resident',
        ...(businessId ? { internal_business_id: businessId } : {})
      }
    };

    const identity = await finixAPI.createIdentity(finixPayload);

    Logger.info('Finix identity created successfully', { id: identity.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        identity 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    Logger.error('Error creating Finix identity', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
