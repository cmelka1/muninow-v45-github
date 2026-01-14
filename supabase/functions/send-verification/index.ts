import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { Logger } from '../shared/logger.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

// Rate limiting for EMAIL only (Twilio handles SMS rate limiting)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkEmailRateLimit(identifier: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const resetIn = Math.ceil((record.resetTime - now) / 1000 / 60);
    return { allowed: false, resetIn };
  }
  
  record.count++;
  rateLimitMap.set(identifier, record);
  return { allowed: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    Logger.info('Request body', body);

    let user_identifier: string | undefined;
    let type: string;

    // Normalizing Input
    const { identifier, type: requestType } = body;
    const { phone, email } = body; // Old format fallback

    if (identifier) {
      user_identifier = identifier;
      type = requestType;
    } else {
      if (phone) { user_identifier = phone; type = 'sms'; }
      else if (email) { user_identifier = email; type = 'email'; }
      else throw new Error("Identifier (phone/email) is required");
    }

    if (!['sms', 'email'].includes(type) || !user_identifier) {
      throw new Error("Invalid request: unknown type or missing identifier");
    }

    // --- SMS PATH: TWILIO VERIFY API ---
    if (type === 'sms') {
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const serviceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID"); // NEW SECRET

      if (!accountSid || !authToken || !serviceSid) {
        throw new Error("Twilio Verify is not configured (Missing Credentials or Service SID)");
      }

      const formattedPhone = formatPhoneNumber(user_identifier);
      Logger.info(`Sending Twilio Verify SMS to: ${formattedPhone}`);

      // Call Twilio Verify API
      const response = await fetch(
        `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: formattedPhone,
            Channel: "sms",
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        Logger.error("Twilio Verify Error", errText);
        throw new Error(`Twilio Verify Failed: ${errText}`);
      }

      Logger.info("Twilio Verify SMS sent successfully");
      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent via SMS (Twilio Verify)" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- EMAIL PATH: RESEND + SUPABASE DB ---
    if (type === 'email') {
      // 1. DB-Backed Rate Limiting (Max 3 attempts per 15 mins)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { count, error: countError } = await supabase
        .from('verification_codes')
        .select('*', { count: 'exact', head: true })
        .eq('user_identifier', user_identifier)
        .eq('verification_type', 'email')
        .gt('created_at', fifteenMinutesAgo);
        
      if (countError) {
        Logger.error("Rate limit check failed", countError);
        // Fail open or closed? Safe to fail open if DB is acting up, but better to log.
      }
      
      if (count !== null && count >= 3) {
         Logger.warn(`Rate limit exceeded for ${user_identifier}`, { count });
         return new Response(
           JSON.stringify({ success: false, error: "Too many attempts. Please try again in 15 minutes." }),
           { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Hash Code
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(code));
      const codeHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      // Store in DB
      const { error: dbError } = await supabase.from('verification_codes').insert({
        user_identifier,
        code_hash: codeHash,
        verification_type: 'email',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        status: 'pending'
      });

      if (dbError) throw dbError;

      // Send Email via Resend
      await sendEmailVerification(user_identifier, code);

      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent via Email" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    Logger.error('Error in send-verification', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helpers
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `+1${cleaned}`; // Default to US
  if (cleaned.length > 10) return `+${cleaned}`; // Already intl?
  return phone; // Fallback
}

async function sendEmailVerification(email: string, code: string) {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY missing");

    const fromAddress = Deno.env.get("EMAIL_FROM_ADDRESS") || "MuniNow <onboarding@resend.dev>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: "Verification Code",
        html: `<p>Your code is: <strong>${code}</strong></p>`
      }),
    });
    
    if (!res.ok) throw new Error(await res.text());
}
