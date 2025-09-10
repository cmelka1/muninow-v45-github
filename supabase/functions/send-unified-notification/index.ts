import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  user_id: string;
  notification_type: 'service_update' | 'payment_confirmation';
  title: string;
  message: string;
  service_type?: string;
  service_number?: string;
  update_type?: string;
  status_change_from?: string;
  status_change_to?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
  entity_details?: any;
  payment_details?: any;
  communication_details?: any;
  delivery_method?: 'email' | 'sms' | 'both';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      user_id,
      notification_type,
      title,
      message,
      service_type,
      service_number,
      update_type,
      status_change_from,
      status_change_to,
      related_entity_type,
      related_entity_id,
      action_url,
      entity_details,
      payment_details,
      communication_details,
      delivery_method = 'both'
    }: NotificationRequest = await req.json();

    console.log('Creating unified notification for user:', user_id, 'type:', notification_type);

    // Insert notification into database
    const { data: notification, error: notificationError } = await supabase
      .from('user_notifications')
      .insert({
        user_id,
        notification_type,
        title,
        message,
        service_type,
        service_number,
        update_type,
        status_change_from,
        status_change_to,
        related_entity_type,
        related_entity_id,
        action_url,
        entity_details,
        payment_details,
        communication_details
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      throw notificationError;
    }

    // Get user preferences to determine delivery method
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      console.error('Error fetching user preferences:', preferencesError);
      // Continue with default preferences if user hasn't set any
    }

    // Get user profile for contact information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, phone, first_name, last_name')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw profileError;
    }

    // Determine if we should send email/SMS based on preferences and notification type
    const shouldSendEmail = preferences 
      ? (notification_type === 'service_update' 
          ? preferences.email_service_updates 
          : preferences.email_payment_confirmations)
      : true; // Default to true if no preferences set

    const shouldSendSMS = preferences 
      ? (notification_type === 'service_update' 
          ? preferences.sms_service_updates 
          : preferences.sms_payment_confirmations)
      : false; // Default to false if no preferences set

    // Prepare rich notification content for email
    let emailSubject = title;
    let emailBody = message;

    // Enhanced email content based on notification type and update type
    if (notification_type === 'service_update') {
      if (update_type === 'communication' && communication_details) {
        emailSubject = `New Message: ${title}`;
        emailBody = `
          <h2>${title}</h2>
          <div style="background: #f8f9fa; padding: 16px; border-left: 4px solid #007bff; margin: 16px 0;">
            <p><strong>${communication_details.commenter_name}</strong> (${communication_details.commenter_role})</p>
            <p>${communication_details.comment_text}</p>
          </div>
          ${action_url ? `<p><a href="${action_url}" style="background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">View Full Conversation</a></p>` : ''}
        `;
      } else if (update_type === 'status_change') {
        emailSubject = `Status Update: ${title}`;
        emailBody = `
          <h2>${title}</h2>
          <p>${message}</p>
          ${status_change_from && status_change_to ? `
            <div style="background: #e8f5e8; padding: 16px; border-radius: 4px; margin: 16px 0;">
              <p><strong>Status Changed:</strong> ${status_change_from} → ${status_change_to}</p>
            </div>
          ` : ''}
          ${action_url ? `<p><a href="${action_url}" style="background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">View Details</a></p>` : ''}
        `;
      }
    } else if (notification_type === 'payment_confirmation') {
      emailSubject = `Payment Confirmed: ${title}`;
      emailBody = `
        <h2>${title}</h2>
        <p>${message}</p>
        ${payment_details ? `
          <div style="background: #f0f8f0; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <h3>Payment Details</h3>
            ${payment_details.amount ? `<p><strong>Amount:</strong> $${(payment_details.amount / 100).toFixed(2)}</p>` : ''}
            ${payment_details.payment_method ? `<p><strong>Payment Method:</strong> ${payment_details.payment_method}</p>` : ''}
            ${payment_details.transaction_id ? `<p><strong>Transaction ID:</strong> ${payment_details.transaction_id}</p>` : ''}
          </div>
        ` : ''}
      `;
    }

    // Send email if enabled
    if (shouldSendEmail && profile.email && (delivery_method === 'email' || delivery_method === 'both')) {
      try {
        // You can integrate with email service here (Resend, SendGrid, etc.)
        console.log('Would send email to:', profile.email, 'Subject:', emailSubject);
        console.log('Email body:', emailBody);
        
        // For now, just log. In production, integrate with email service:
        /*
        const emailResponse = await resend.emails.send({
          from: 'MuniNow <notifications@muninow.com>',
          to: [profile.email],
          subject: emailSubject,
          html: emailBody
        });
        */
      } catch (error) {
        console.error('Error sending email:', error);
      }
    }

    // Send SMS if enabled
    if (shouldSendSMS && profile.phone && (delivery_method === 'sms' || delivery_method === 'both')) {
      try {
        // Prepare truncated SMS message
        let smsMessage = message;
        if (update_type === 'communication' && communication_details) {
          const commenterName = communication_details.commenter_name;
          const commentText = communication_details.comment_text.substring(0, 100) + '...';
          smsMessage = `${commenterName}: ${commentText}`;
        }
        
        // Truncate to SMS limits and add link
        if (smsMessage.length > 140) {
          smsMessage = smsMessage.substring(0, 140) + '...';
        }
        
        if (action_url) {
          smsMessage += ` View details: ${action_url}`;
        }

        console.log('Would send SMS to:', profile.phone, 'Message:', smsMessage);
        
        // For now, just log. In production, integrate with SMS service:
        /*
        const smsResponse = await twilio.messages.create({
          body: smsMessage,
          to: profile.phone,
          from: '+1234567890' // Your Twilio number
        });
        */
      } catch (error) {
        console.error('Error sending SMS:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: notification.id,
        delivered: {
          email: shouldSendEmail && profile.email,
          sms: shouldSendSMS && profile.phone
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-unified-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);