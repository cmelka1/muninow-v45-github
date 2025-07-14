import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  billId: string;
  deliveryMethod: 'email' | 'sms' | 'both' | 'in_person_visit';
  messageSubject?: string;
  messageBody?: string;
  visitNotes?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the JWT token from the request header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { billId, deliveryMethod, messageSubject, messageBody, visitNotes }: NotificationRequest = await req.json();

    console.log('Processing notification request:', { billId, deliveryMethod });

    // Extract and verify JWT token to get user information
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    if (!userId) {
      throw new Error('Invalid token - no user ID found');
    }

    console.log('Authenticated user:', userId);

    // Verify user is a municipal user and get their profile
    const { data: municipalProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('account_type', 'municipal')
      .single();

    if (profileError || !municipalProfile) {
      console.error('Municipal profile error:', profileError);
      throw new Error('Unauthorized - not a municipal user');
    }

    // Get bill details
    const { data: bill, error: billError } = await supabase
      .from('master_bills')
      .select(`
        *,
        profiles!user_id(
          id, first_name, last_name, email, phone
        )
      `)
      .eq('bill_id', billId)
      .single();

    if (billError || !bill) {
      console.error('Bill query error:', billError);
      throw new Error('Bill not found');
    }

    // Verify municipal user has access to this customer's bills
    if (municipalProfile.customer_id !== bill.customer_id) {
      console.error('Access denied: customer_id mismatch', {
        userCustomerId: municipalProfile.customer_id,
        billCustomerId: bill.customer_id
      });
      throw new Error('Access denied - bill not in your jurisdiction');
    }

    // Create notification record
    const notificationData = {
      bill_id: billId,
      user_id: bill.user_id,
      municipal_user_id: userId,
      merchant_id: bill.merchant_id,
      customer_id: bill.customer_id,
      notification_type: 'manual',
      delivery_method: deliveryMethod,
      message_subject: messageSubject,
      message_body: messageBody,
      visit_notes: visitNotes,
      municipal_employee_name: `${municipalProfile.first_name} ${municipalProfile.last_name}`,
      delivery_status: deliveryMethod === 'in_person_visit' ? 'completed' : 'pending',
      sent_at: deliveryMethod === 'in_person_visit' ? new Date().toISOString() : null,
    };

    const { data: notification, error: notificationError } = await supabase
      .from('bill_notifications')
      .insert(notificationData)
      .select()
      .single();

    if (notificationError) {
      throw new Error(`Failed to create notification: ${notificationError.message}`);
    }

    // If in-person visit, we're done - no electronic sending required
    if (deliveryMethod === 'in_person_visit') {
      console.log('In-person visit logged successfully');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'In-person visit logged successfully',
          notificationId: notification.id 
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // For electronic notifications, prepare the message
    const userProfile = bill.profiles;
    if (!userProfile) {
      throw new Error('User profile not found for notification');
    }

    const billAmount = (bill.amount_due_cents / 100).toFixed(2);
    const dueDate = bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A';
    
    const defaultSubject = messageSubject || `Bill Notification - ${bill.external_bill_number}`;
    const defaultMessage = messageBody || `
      Hello ${userProfile.first_name},
      
      This is a notification regarding your bill ${bill.external_bill_number}.
      
      Amount Due: $${billAmount}
      Due Date: ${dueDate}
      
      Please contact us if you have any questions.
      
      Best regards,
      ${municipalProfile.first_name} ${municipalProfile.last_name}
    `.trim();

    let emailSent = false;
    let smsSent = false;
    let errors: string[] = [];

    // Send email notification
    if (deliveryMethod === 'email' || deliveryMethod === 'both') {
      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
          throw new Error('Resend API key not configured');
        }

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'MuniNow <notifications@muninow.com>',
            to: [userProfile.email],
            subject: defaultSubject,
            text: defaultMessage,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
          console.log('Email sent successfully');
        } else {
          const errorText = await emailResponse.text();
          throw new Error(`Email failed: ${errorText}`);
        }
      } catch (error) {
        console.error('Email error:', error);
        errors.push(`Email: ${error.message}`);
      }
    }

    // Send SMS notification
    if (deliveryMethod === 'sms' || deliveryMethod === 'both') {
      try {
        const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

        if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
          throw new Error('Twilio credentials not configured');
        }

        if (!userProfile.phone) {
          throw new Error('User phone number not available');
        }

        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: twilioFromNumber,
              To: userProfile.phone,
              Body: `${defaultSubject}\n\n${defaultMessage}`,
            }),
          }
        );

        if (twilioResponse.ok) {
          smsSent = true;
          console.log('SMS sent successfully');
        } else {
          const errorText = await twilioResponse.text();
          throw new Error(`SMS failed: ${errorText}`);
        }
      } catch (error) {
        console.error('SMS error:', error);
        errors.push(`SMS: ${error.message}`);
      }
    }

    // Update notification status
    let finalStatus = 'failed';
    let errorMessage = null;

    if (deliveryMethod === 'email' && emailSent) {
      finalStatus = 'sent';
    } else if (deliveryMethod === 'sms' && smsSent) {
      finalStatus = 'sent';
    } else if (deliveryMethod === 'both' && emailSent && smsSent) {
      finalStatus = 'sent';
    } else if (deliveryMethod === 'both' && (emailSent || smsSent)) {
      finalStatus = 'sent';
      errorMessage = errors.join('; ');
    } else {
      errorMessage = errors.join('; ');
    }

    await supabase
      .from('bill_notifications')
      .update({
        delivery_status: finalStatus,
        error_message: errorMessage,
        sent_at: finalStatus === 'sent' ? new Date().toISOString() : null,
      })
      .eq('id', notification.id);

    return new Response(
      JSON.stringify({
        success: finalStatus === 'sent',
        message: finalStatus === 'sent' ? 'Notification sent successfully' : 'Notification failed',
        notificationId: notification.id,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
});