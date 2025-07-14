import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-finix-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log(`Rejected ${req.method} request - only POST allowed`);
    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: { 
        ...corsHeaders,
        'Allow': 'POST'
      }
    });
  }

  const startTime = Date.now();
  const correlationId = crypto.randomUUID();
  
  try {
    // Extract headers as JavaScript object
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Read raw request body (do not parse as JSON)
    const rawBody = await req.text();
    
    // Log debugging information
    console.log('=== Webhook Request Received ===');
    console.log('Correlation ID:', correlationId);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Content-Length:', headers['content-length'] || 'unknown');
    console.log('Remote IP:', req.headers.get('x-forwarded-for') || 'unknown');
    
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Raw Body:', rawBody);

    // Identify webhook source
    const userAgent = headers['user-agent'] || '';
    const finixSignature = headers['x-finix-signature'];
    
    if (userAgent.toLowerCase().includes('stripe')) {
      console.log('✅ Stripe webhook received');
    } else if (finixSignature) {
      console.log('✅ Finix webhook received');
    } else {
      console.log('❓ Unknown webhook source');
    }

    const processingTime = Date.now() - startTime;
    console.log(`Processing completed in ${processingTime}ms`);
    console.log('=== End Webhook Request ===\n');

    // Return success response
    return new Response('OK', {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Webhook processing error:', error);
    console.error('Correlation ID:', correlationId);
    console.error(`Failed after ${processingTime}ms`);
    
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    });
  }
});