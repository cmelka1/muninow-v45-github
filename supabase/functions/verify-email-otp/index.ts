import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { Logger } from '../shared/logger.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hash function matching send-email-otp
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const MAX_ATTEMPTS = 5;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, code } = await req.json();
    
    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the most recent pending code for this email
    const { data: verificationRecord, error: fetchError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('user_identifier', email)
      .eq('verification_type', 'email')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verificationRecord) {
      Logger.warn(`No pending verification found for ${email}`);
      return new Response(
        JSON.stringify({ error: "No pending verification found. Please request a new code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(verificationRecord.expires_at) < new Date()) {
      await supabase
        .from('verification_codes')
        .update({ status: 'expired' })
        .eq('id', verificationRecord.id);

      return new Response(
        JSON.stringify({ error: "Verification code has expired. Please request a new code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check attempt count
    if (verificationRecord.attempt_count >= MAX_ATTEMPTS) {
      await supabase
        .from('verification_codes')
        .update({ status: 'expired' })
        .eq('id', verificationRecord.id);

      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Please request a new code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the provided code and compare
    const providedHash = await hashCode(code);
    
    if (providedHash !== verificationRecord.code_hash) {
      // Increment attempt count
      await supabase
        .from('verification_codes')
        .update({ 
          attempt_count: verificationRecord.attempt_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', verificationRecord.id);

      const remainingAttempts = MAX_ATTEMPTS - verificationRecord.attempt_count - 1;
      Logger.warn(`Invalid code for ${email}. ${remainingAttempts} attempts remaining.`);
      
      return new Response(
        JSON.stringify({ 
          error: "Invalid verification code.",
          remainingAttempts 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success! Mark the code as verified
    await supabase
      .from('verification_codes')
      .update({ 
        status: 'verified',
        updated_at: new Date().toISOString()
      })
      .eq('id', verificationRecord.id);

    Logger.info(`Email verified successfully: ${email}`);

    return new Response(
      JSON.stringify({ success: true, verified: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    Logger.error("Error in verify-email-otp", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
