
import { Logger } from './logger.ts';

export interface NotificationParams {
  user_id: string;
  notification_type: 'service_update' | 'payment_confirmation' | 'security_alert' | 'general';
  title: string;
  message: string;
  [key: string]: any; // Allow other properties for checking preferences or extra metadata
}

export async function sendUnifiedNotification(
  supabase: any,
  params: NotificationParams
) {
  const { user_id, notification_type, title, message, ...rest } = params;

  Logger.info('Sending unified notification', { user_id, notification_type, title });

  // 1. Insert into DB
  const { data: notification, error: dbError } = await supabase
    .from('user_notifications')
    .insert({
      user_id,
      notification_type,
      title,
      message,
      ...rest
    })
    .select()
    .single();

  if (dbError) throw dbError;

  // 2. Fetch User Prefs & Profile
  const { data: prefs } = await supabase.from('user_notification_preferences').select('*').eq('user_id', user_id).single();
  const { data: profile } = await supabase.from('profiles').select('email, phone').eq('id', user_id).single();

  if (!profile) {
      Logger.error("Profile not found for user", { user_id });
      return { success: false, error: "Profile not found" };
      // Note: We already inserted the in-app notification, so maybe we shouldn't throw if just email fails?
      // But preserving original behavior:
      // if (!profile) throw new Error("Profile not found");
  }

  // Defaults
  // Types: service_update, payment_confirmation
  // Map security_alert / general to safe defaults (e.g. always email)
  let shouldSendEmail = true;
  let shouldSendSMS = false;

  if (prefs) {
      if (notification_type === 'service_update') {
          shouldSendEmail = prefs.email_service_updates;
          shouldSendSMS = prefs.sms_service_updates;
      } else if (notification_type === 'payment_confirmation') {
          shouldSendEmail = prefs.email_payment_confirmations;
          shouldSendSMS = prefs.sms_payment_confirmations;
      }
  }

  // 3. Send Email (Resend via Fetch)
  if (shouldSendEmail && profile.email) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
           Logger.info(`Sending email to ${profile.email}`);
           try {
             await fetch("https://api.resend.com/emails", {
                 method: "POST",
                 headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
                 body: JSON.stringify({
                     from: Deno.env.get("EMAIL_FROM_ADDRESS") || Deno.env.get("EMAIL_FROM_ALERTS") || "MuniNow Alerts <alerts@resend.dev>",
                     to: [profile.email],
                     subject: title,
                     html: `<p>${message}</p>`
                 })
             });
           } catch (e) {
               Logger.error("Failed to send email", e);
           }
      }
  }

  // 4. Send SMS (Twilio Programmable Messaging via Fetch)
  if (shouldSendSMS && profile.phone) {
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER"); 

      if (accountSid && authToken && fromNumber) {
          Logger.info(`Sending SMS to ${profile.phone}`);
          const formattedPhone = profile.phone.replace(/\D/g, '').length === 10 ? `+1${profile.phone.replace(/\D/g, '')}` : profile.phone;
          
          try {
            await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    To: formattedPhone,
                    From: fromNumber,
                    Body: `${title}: ${message}`
                })
            });
          } catch (e) {
              Logger.error("Failed to send SMS", e);
          }
      } else {
           Logger.warn("Twilio Credentials or Phone Number missing. SMS skipped.");
      }
  }

  return { success: true, notification_id: notification.id };
}
