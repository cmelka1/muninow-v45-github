
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Logger } from '../shared/logger.ts';


const AUTHORIZED_EMAIL = "cmelka@muninow.com"; 

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  message: string;

}

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 3;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const formData: ContactFormData = await req.json();
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }



    // Rate Limiting (In-Memory Best Effort)
    const now = Date.now();
    const userAttempts = rateLimitMap.get(formData.email) || [];
    // Filter out old attempts
    const recentAttempts = userAttempts.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
    
    if (recentAttempts.length >= MAX_ATTEMPTS) {
      Logger.warn(`Rate limit exceeded for contact form: ${formData.email}`);
      return new Response(
        JSON.stringify({ error: "Too many messages sent. Please try again later." }), 
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Update rate limit
    recentAttempts.push(now);
    rateLimitMap.set(formData.email, recentAttempts);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not set");

    const fromAddress = Deno.env.get("EMAIL_FROM_ADDRESS") || "MuniNow Contact <contact@resend.dev>";
    const toAddress = Deno.env.get("CONTACT_EMAIL_RECIPIENT") || "cmelka@muninow.com";

    Logger.info(`Sending contact email from ${formData.email} to ${toAddress}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toAddress], 
        reply_to: formData.email,
        subject: `New Contact Form: ${formData.organization}`,
        html: `
          <h3>New Contact Message</h3>
          <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Organization:</strong> ${formData.organization}</p>
          <hr />
          <p>${formData.message.replace(/\n/g, '<br>')}</p>
        `,
      }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        Logger.error("Resend API Error", errorText);
        throw new Error(`Failed to send email: ${errorText}`);
    }

    const data = await res.json();

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    Logger.error("Error processing contact form", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});