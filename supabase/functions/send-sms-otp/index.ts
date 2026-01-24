import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { Logger } from '../shared/logger.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// SHA-256 hash for OTP storage
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Normalize phone number to E.164 format
function normalizePhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  // Already has country code or international format
  return phone.startsWith('+') ? phone : `+${digitsOnly}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    
    if (!phone || typeof phone !== 'string') {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Rate limiting: Check recent codes for this phone (max 5 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_identifier', normalizedPhone)
      .eq('verification_type', 'sms')
      .gte('created_at', oneHourAgo);

    if (count && count >= 5) {
      Logger.warn(`Rate limit exceeded for SMS OTP: ${normalizedPhone}`);
      return new Response(
        JSON.stringify({ error: "Too many verification attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate OTP and hash for storage
    const otp = generateOTP();
    const codeHash = await hashCode(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Invalidate any existing pending codes for this phone
    await supabase
      .from('verification_codes')
      .update({ status: 'expired' })
      .eq('user_identifier', normalizedPhone)
      .eq('verification_type', 'sms')
      .eq('status', 'pending');

    // Insert new verification code
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        user_identifier: normalizedPhone,
        code_hash: codeHash,
        verification_type: 'sms',
        status: 'pending',
        expires_at: expiresAt,
        attempt_count: 0
      });

    if (insertError) {
      Logger.error("Failed to insert verification code", insertError.message);
      throw new Error("Failed to create verification code");
    }

    // Send SMS via Twilio (same pattern as notificationUtils.ts)
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error("Twilio credentials not configured");
    }

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: normalizedPhone,
          From: fromNumber,
          Body: `Your MuniNow verification code is: ${otp}. It expires in 10 minutes.`
        })
      }
    );

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      Logger.error("Twilio API Error", errorText);
      throw new Error(`Failed to send SMS: ${errorText}`);
    }

    Logger.info(`Verification SMS sent to ${normalizedPhone}`);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    Logger.error("Error in send-sms-otp", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
