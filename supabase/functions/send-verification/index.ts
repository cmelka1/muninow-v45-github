import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Simple logger for debugging
function log(level: string, message: string, data?: unknown) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  }));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();
    log('INFO', 'Request received', { 
      identifier: body.identifier,
      type: body.type,
      phone: body.phone,
      email: body.email
    });

    // Extract identifier - support both new format (identifier/type) and old format (phone/email)
    let userIdentifier: string;
    let verificationType: string;

    if (body.identifier) {
      userIdentifier = body.identifier;
      verificationType = body.type || 'sms';
    } else if (body.phone) {
      userIdentifier = body.phone;
      verificationType = 'sms';
    } else if (body.email) {
      userIdentifier = body.email;
      verificationType = 'email';
    } else {
      log('ERROR', 'Missing identifier', body);
      return new Response(
        JSON.stringify({ success: false, error: "Phone or email is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('INFO', 'Processing verification', { userIdentifier, verificationType });

    // --- SMS PATH: TWILIO VERIFY API ---
    if (verificationType === 'sms') {
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const serviceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

      log('INFO', 'Twilio credentials check', { 
        hasAccountSid: !!accountSid, 
        hasAuthToken: !!authToken, 
        hasServiceSid: !!serviceSid 
      });

      if (!accountSid || !authToken || !serviceSid) {
        log('ERROR', 'Twilio credentials missing');
        return new Response(
          JSON.stringify({ success: false, error: "SMS service is not configured" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Format phone number to E.164
      const formattedPhone = formatPhoneNumber(userIdentifier);
      log('INFO', 'Formatted phone', { original: userIdentifier, formatted: formattedPhone });

      // Call Twilio Verify API
      const twilioUrl = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
      log('INFO', 'Calling Twilio Verify API', { url: twilioUrl });

      const response = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedPhone,
          Channel: "sms",
        }),
      });

      const responseText = await response.text();
      log('INFO', 'Twilio response', { status: response.status, body: responseText });

      if (!response.ok) {
        log('ERROR', 'Twilio Verify failed', { status: response.status, error: responseText });
        return new Response(
          JSON.stringify({ success: false, error: `SMS delivery failed: ${responseText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      log('INFO', 'SMS sent successfully');
      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent via SMS" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- EMAIL PATH: RESEND API ---
    if (verificationType === 'email') {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "", 
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Hash the code for storage
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(code));
      const codeHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Store in database
      const { error: dbError } = await supabase.from('verification_codes').insert({
        user_identifier: userIdentifier,
        code_hash: codeHash,
        verification_type: 'email',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        status: 'pending'
      });

      if (dbError) {
        log('ERROR', 'Database error', dbError);
        throw dbError;
      }

      // Send email via Resend
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        log('ERROR', 'RESEND_API_KEY missing');
        throw new Error("Email service is not configured");
      }

      const fromAddress = Deno.env.get("EMAIL_FROM_ADDRESS") || "MuniNow <onboarding@resend.dev>";

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${resendApiKey}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [userIdentifier],
          subject: "Your Verification Code",
          html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        log('ERROR', 'Resend error', errText);
        throw new Error(`Email delivery failed: ${errText}`);
      }

      log('INFO', 'Email sent successfully');
      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent via Email" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown type
    return new Response(
      JSON.stringify({ success: false, error: "Invalid verification type" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Error in send-verification', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Format phone number to E.164 format for Twilio
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If 10 digits, assume US and add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If 11 digits starting with 1, it's already US format
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // If it already has a + prefix, return as-is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: add + prefix
  return `+${cleaned}`;
}
