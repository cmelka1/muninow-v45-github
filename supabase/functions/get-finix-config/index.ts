import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const finixAppId = Deno.env.get('FINIX_USER_APPLICATION_ID');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';

    if (!finixAppId) {
      Logger.error('Missing FINIX_USER_APPLICATION_ID');
      throw new Error('Finix user application ID not configured');
    }

    if (!finixAppId.startsWith('AP')) {
      Logger.error('Invalid FINIX_USER_APPLICATION_ID format', { finixAppId });
      throw new Error('Invalid Finix user application ID format');
    }

    Logger.info('Returning Finix config', {
      applicationId: finixAppId,
      environment: finixEnvironment
    });

    return new Response(
      JSON.stringify({
        success: true,
        applicationId: finixAppId,
        environment: finixEnvironment,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    Logger.error('Error getting Finix config', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
