import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const AUTHORIZED_EMAIL = "cmelka@muninow.com"; // Your verified email address

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

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData: ContactFormData = await req.json();
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Processing contact form from ${formData.email}`);
    
    try {
      // Send email to your verified email (until domain is verified in Resend)
      const { data, error } = await resend.emails.send({
        from: "MuniNow Contact Form <onboarding@resend.dev>",
        to: [AUTHORIZED_EMAIL], // Always send to your verified email
        subject: `Contact Form: ${formData.firstName} ${formData.lastName}`,
        reply_to: formData.email,
        html: `
          <h1>New Contact Form Submission</h1>
          <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Organization:</strong> ${formData.organization || "Not provided"}</p>
          <p><strong>Message:</strong></p>
          <p>${formData.message || "No message provided"}</p>
        `,
      });

      if (error) {
        console.error("Error sending contact email:", error);
        throw error;
      }
      
      console.log("Successfully sent email to admin");
      
      // For confirmation email, we need to check if the user's email matches our verified email
      if (formData.email.toLowerCase() === AUTHORIZED_EMAIL.toLowerCase()) {
        try {
          // Only send confirmation email if it's to our verified address
          await resend.emails.send({
            from: "MuniNow <onboarding@resend.dev>",
            to: [formData.email],
            subject: "Thank you for contacting MuniNow",
            html: `
              <h1>Thank You for Contacting MuniNow</h1>
              <p>Dear ${formData.firstName},</p>
              <p>We have received your inquiry and will get back to you as soon as possible.</p>
              <p>Below is a copy of your message:</p>
              <blockquote>
                ${formData.message || "No message provided"}
              </blockquote>
              <p>Best regards,<br>The MuniNow Team</p>
            `,
          });
          console.log("Successfully sent confirmation email");
        } catch (confirmError) {
          // Just log the error but don't fail the whole request
          console.error("Error sending confirmation email:", confirmError);
        }
      } else {
        console.log("Skipping confirmation email - recipient not verified in Resend");
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          id: data?.id,
          note: "Message received. We'll get back to you as soon as possible."
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } catch (emailError: any) {
      console.error("Detailed email error:", emailError);
      
      // Special handling for domain verification errors
      if (emailError.message && emailError.message.includes("verify a domain")) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            id: "domain-not-verified",
            note: "Your message has been received but email delivery is limited until domain verification."
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      throw emailError;
    }
  } catch (error) {
    console.error("Error processing contact form:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Error processing your request" 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});