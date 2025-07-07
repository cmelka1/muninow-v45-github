import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Performance logging helper (removed for production)
function logPerformance(operation: string, startTime: number, additionalData?: any) {
  return Date.now() - startTime;
}

// Helper functions for hashing using Deno's crypto API
async function hashCode(code: string) {
  const startTime = Date.now();
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const result = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  logPerformance("hashCode", startTime);
  return result;
}

async function compareCode(inputCode: string, hashedCode: string) {
  const startTime = Date.now();
  const inputHash = await hashCode(inputCode);
  const result = inputHash === hashedCode;
  logPerformance("compareCode", startTime, { result });
  return result;
}

const handler = async (req: Request) => {
  const requestStartTime = Date.now();

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    logPerformance("CORS preflight", requestStartTime);
    return new Response(null, { headers: corsHeaders });
  }

  // Validate environment variables
  const envCheckStart = Date.now();
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY'];
  for (const envVar of requiredEnvVars) {
    if (!Deno.env.get(envVar)) {
      return new Response(JSON.stringify({
        error: `Server configuration error: Missing ${envVar}`,
        success: false
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
  logPerformance("Environment validation", envCheckStart);

  try {
    const parseStart = Date.now();
    const { identifier, type, action = 'send', code } = await req.json();
    logPerformance("Request parsing", parseStart, { identifier: identifier?.substring(0, 5) + '...', type, action });

    console.log(`Processing ${action} request for ${type}: ${identifier?.substring(0, 5)}...`);

    if (action === 'send') {
      const result = await sendVerificationCode(identifier, type);
      logPerformance("TOTAL REQUEST (send)", requestStartTime);
      return result;
    } else if (action === 'verify') {
      const result = await verifyCode(identifier, type, code);
      logPerformance("TOTAL REQUEST (verify)", requestStartTime);
      return result;
    } else {
      throw new Error('Invalid action');
    }
  } catch (error) {
    console.error("Error in send-verification function:", error);
    logPerformance("TOTAL REQUEST (error)", requestStartTime);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

async function sendVerificationCode(identifier: string, type: string) {
  const functionStartTime = Date.now();
  console.log(`SEND_CODE_START: ${type} for ${identifier?.substring(0, 5)}...`);

  // Normalize identifier
  const normalizeStart = Date.now();
  let normalizedIdentifier = identifier;
  if (type === 'sms') {
    normalizedIdentifier = normalizePhoneNumber(identifier);
    console.log(`Normalized phone number from ${identifier} to ${normalizedIdentifier}`);
  }
  logPerformance("Phone normalization", normalizeStart);

  // Clean up old codes
  const cleanupStart = Date.now();
  const { error: cleanupError } = await supabase
    .from('verification_codes')
    .update({ status: 'expired' })
    .eq('user_identifier', normalizedIdentifier)
    .eq('verification_type', type)
    .eq('status', 'pending');
  
  if (cleanupError) {
    console.error("Cleanup error:", cleanupError);
  }
  logPerformance("Cleanup old codes", cleanupStart);

  // Rate limiting check
  const rateLimitStart = Date.now();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recentCodes, error: checkError } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('user_identifier', normalizedIdentifier)
    .eq('verification_type', type)
    .gte('created_at', tenMinutesAgo);
  
  logPerformance("Rate limit check", rateLimitStart, { recentCodes: recentCodes?.length });

  if (checkError) {
    throw new Error(`Error checking rate limit: ${checkError.message}`);
  }

  if (recentCodes && recentCodes.length >= 3) {
    logPerformance("SEND_CODE_COMPLETE (rate limited)", functionStartTime);
    return new Response(JSON.stringify({
      error: "Too many verification attempts. Please wait 10 minutes before trying again.",
      success: false
    }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  // Generate code
  const codeGenStart = Date.now();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await hashCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  logPerformance("Code generation & hashing", codeGenStart);

  // Store verification code
  const storeStart = Date.now();
  const { error: insertError } = await supabase
    .from('verification_codes')
    .insert({
      user_identifier: normalizedIdentifier,
      code_hash: codeHash,
      verification_type: type,
      expires_at: expiresAt,
      status: 'pending'
    });

  if (insertError) {
    throw new Error(`Error storing verification code: ${insertError.message}`);
  }
  logPerformance("Store verification code", storeStart);

  // Send code
  const sendStart = Date.now();
  try {
    if (type === 'email') {
      await sendEmailCode(identifier, code);
    } else if (type === 'sms') {
      await sendSMSCode(identifier, code);
    }
    logPerformance("Send code via " + type, sendStart);
    logPerformance("SEND_CODE_COMPLETE (success)", functionStartTime);

    return new Response(JSON.stringify({
      message: `Verification code sent via ${type}`,
      success: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (sendError) {
    logPerformance("Send code via " + type + " (error)", sendStart);
    console.error(`Error sending ${type} code:`, sendError);
    
    // Clean up the stored code if sending failed
    const rollbackStart = Date.now();
    await supabase
      .from('verification_codes')
      .update({ status: 'expired' })
      .eq('user_identifier', normalizedIdentifier)
      .eq('verification_type', type)
      .eq('status', 'pending');
    logPerformance("Rollback failed code", rollbackStart);
    
    logPerformance("SEND_CODE_COMPLETE (send error)", functionStartTime);
    throw new Error(`Failed to send verification code: ${sendError.message}`);
  }
}

async function sendEmailCode(email: string, code: string) {
  const emailStart = Date.now();
  console.log(`RESEND_START: Sending email to ${email?.substring(0, 5)}...`);
  
  const emailResponse = await resend.emails.send({
    from: "MuniNow <verification@resend.dev>",
    to: [email],
    subject: "Your MuniNow Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">MuniNow Verification</h1>
          <p style="color: #666; font-size: 16px;">Complete your account setup</p>
        </div>
        
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 30px;">
          <h2 style="color: #333; margin-bottom: 20px;">Your Verification Code</h2>
          <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; margin: 20px 0; font-family: 'Courier New', monospace;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            This code will expire in 10 minutes
          </p>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; margin-bottom: 10px;">
            Enter this code to verify your email address and complete your MuniNow account setup.
          </p>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <div style="text-align: center;">
          <p style="color: #999; font-size: 12px;">
            This is an automated message from MuniNow. Please do not reply to this email.
          </p>
        </div>
      </div>
    `
  });

  logPerformance("Resend API call", emailStart, { 
    success: !emailResponse.error,
    error: emailResponse.error?.message 
  });

  if (emailResponse.error) {
    throw new Error(`Email sending failed: ${emailResponse.error.message}`);
  }
}

function normalizePhoneNumber(phone: string) {
  const normalizeStart = Date.now();
  let cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
    cleanPhone = cleanPhone.substring(1);
  }
  
  if (cleanPhone.length !== 10) {
    throw new Error(`Invalid US phone number format. Expected 10 digits, got ${cleanPhone.length}: ${cleanPhone}`);
  }
  
  const result = `+1${cleanPhone}`;
  logPerformance("Phone normalization", normalizeStart, { input: phone?.substring(0, 5) + '...', output: result });
  return result;
}

async function sendSMSCode(phone: string, code: string) {
  const smsStart = Date.now();
  console.log(`TWILIO_START: Sending SMS to ${phone?.substring(0, 5)}...`);
  
  const normalizedPhone = normalizePhoneNumber(phone);
  const formattedPhone = normalizedPhone;
  
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '+18333691461';

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  console.log(`Using Twilio sender number: ${twilioNumber}`);
  const message = `Your MuniNow verification code is: ${code}. This code expires in 10 minutes.`;

  const twilioApiStart = Date.now();
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: twilioNumber,
        To: formattedPhone,
        Body: message
      })
    });

    logPerformance("Twilio Messages API call", twilioApiStart, { 
      status: response.status, 
      ok: response.ok 
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Twilio API error response: ${errorData}`);
      
      try {
        const errorJson = JSON.parse(errorData);
        const twilioError = errorJson.message || errorData;
        throw new Error(`SMS sending failed: ${twilioError}`);
      } catch {
        throw new Error(`SMS sending failed: ${errorData}`);
      }
    }

    logPerformance("SMS send complete", smsStart);
    console.log(`SMS sent successfully to ${formattedPhone}`);
  } catch (error) {
    logPerformance("SMS send error", smsStart);
    console.error(`Error sending SMS to ${formattedPhone}:`, error);
    throw error;
  }
}

async function verifyCode(identifier: string, type: string, inputCode: string) {
  const verifyStart = Date.now();
  console.log(`VERIFY_START: ${type} for ${identifier?.substring(0, 5)}...`);

  if (!inputCode || inputCode.length !== 6) {
    logPerformance("VERIFY_COMPLETE (invalid input)", verifyStart);
    return new Response(JSON.stringify({
      error: "Please enter a valid 6-digit code",
      success: false
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  // Normalize identifier
  const normalizeStart = Date.now();
  let normalizedIdentifier = identifier;
  if (type === 'sms') {
    normalizedIdentifier = normalizePhoneNumber(identifier);
  }
  logPerformance("Identifier normalization", normalizeStart);

  // Database lookup
  const lookupStart = Date.now();
  const { data: codes, error: fetchError } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('user_identifier', normalizedIdentifier)
    .eq('verification_type', type)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  logPerformance("Database lookup", lookupStart, { 
    found: codes?.length || 0,
    error: fetchError?.message 
  });

  if (fetchError) {
    console.error(`Database fetch error: ${fetchError.message}`);
    throw new Error(`Error fetching verification code: ${fetchError.message}`);
  }

  if (!codes || codes.length === 0) {
    logPerformance("VERIFY_COMPLETE (no valid codes)", verifyStart);
    return new Response(JSON.stringify({
      error: "No valid verification code found. Please request a new code.",
      success: false
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  const storedCode = codes[0];
  const newAttemptCount = storedCode.attempt_count + 1;

  // Code comparison
  const compareStart = Date.now();
  const isValidCode = await compareCode(inputCode, storedCode.code_hash);
  logPerformance("Code comparison", compareStart, { valid: isValidCode });

  if (isValidCode) {
    // Update as verified
    const updateStart = Date.now();
    const { error: updateError } = await supabase
      .from('verification_codes')
      .update({
        status: 'verified',
        attempt_count: newAttemptCount
      })
      .eq('id', storedCode.id);

    logPerformance("Update verified status", updateStart, { error: updateError?.message });

    if (updateError) {
      throw new Error(`Error updating verification code: ${updateError.message}`);
    }

    logPerformance("VERIFY_COMPLETE (success)", verifyStart);
    return new Response(JSON.stringify({
      message: "Code verified successfully",
      success: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } else {
    // Update attempt count
    const updateStart = Date.now();
    await supabase
      .from('verification_codes')
      .update({ attempt_count: newAttemptCount })
      .eq('id', storedCode.id);
    logPerformance("Update attempt count", updateStart);

    // Check if too many attempts
    if (newAttemptCount >= 3) {
      const expireStart = Date.now();
      await supabase
        .from('verification_codes')
        .update({ status: 'expired' })
        .eq('id', storedCode.id);
      logPerformance("Expire code (too many attempts)", expireStart);

      logPerformance("VERIFY_COMPLETE (too many attempts)", verifyStart);
      return new Response(JSON.stringify({
        error: "Too many incorrect attempts. Please request a new code.",
        success: false
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    logPerformance("VERIFY_COMPLETE (incorrect code)", verifyStart);
    return new Response(JSON.stringify({
      error: `Incorrect code. ${3 - newAttemptCount} attempts remaining.`,
      success: false
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

serve(handler);