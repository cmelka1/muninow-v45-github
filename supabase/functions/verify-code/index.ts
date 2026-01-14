import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { Logger } from "../shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const MAX_VERIFICATION_ATTEMPTS = 5;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { user_identifier, code, verification_type } = await req.json();
    Logger.info('Verify code request', { user_identifier, verification_type });

    if (!user_identifier || !code) throw new Error('User identifier and code are required');

    // --- SMS PATH: TWILIO VERIFY CHECK ---
    if (verification_type === 'sms') {
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const serviceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

      if (!accountSid || !authToken || !serviceSid) {
        throw new Error("Twilio Verify Not Configured (Missing Secrets)");
      }

      const formattedPhone = user_identifier.replace(/\D/g, '').length === 10 ? `+1${user_identifier.replace(/\D/g, '')}` : user_identifier;

      Logger.info('Verifying SMS', { phone: formattedPhone });

      const response = await fetch(
        `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationChecks`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: formattedPhone, Code: code }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        Logger.error("Twilio Verify Check Error", data);
        throw new Error(`Verification Failed: ${data.message || 'Unknown error'}`);
      }

      if (data.status === 'approved') {
        return new Response(
          JSON.stringify({ success: true, message: 'Code verified successfully', verification_type: 'sms' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid code or expired.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // --- EMAIL PATH: DATABASE HASH CHECK (Legacy) ---
    if (verification_type === 'email') {
       // Hash incoming code
       const encoder = new TextEncoder();
       const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(code));
       const codeHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

       // Look up in DB
       const { data: record, error } = await supabase
         .from('verification_codes')
         .select('*')
         .eq('user_identifier', user_identifier)
         .eq('code_hash', codeHash)
         .eq('status', 'pending')
         .gte('expires_at', new Date().toISOString())
         .maybeSingle();

       if (error) throw error;
       
       if (!record) {
         // (Optional: Implement attempt counting here if desired, skipping for brevity as moving to Twilio favored)
         return new Response(
           JSON.stringify({ success: false, error: 'Invalid or expired verification code' }),
           { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }

       // Mark verified
       await supabase.from('verification_codes').update({ status: 'verified', updated_at: new Date().toISOString() }).eq('id', record.id);

       return new Response(
         JSON.stringify({ success: true, message: 'Code verified successfully', verification_type: 'email' }),
         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
    }

    throw new Error("Invalid verification_type (must be 'sms' or 'email')");

  } catch (error: any) {
    Logger.error("Error in verify-code", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
