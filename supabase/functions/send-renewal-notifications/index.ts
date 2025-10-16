import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpiringLicense {
  license_id: string;
  user_id: string;
  license_number: string;
  expires_at: string;
  days_until_expiration: number;
  old_status: string;
  new_status: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting renewal notification check...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call the check_expiring_licenses function to update statuses
    const { data: expiringLicenses, error: checkError } = await supabase
      .rpc('check_expiring_licenses');

    if (checkError) {
      console.error('Error checking expiring licenses:', checkError);
      throw checkError;
    }

    console.log(`Found ${expiringLicenses?.length || 0} licenses with status changes`);

    const notificationsSent: any[] = [];
    const notificationErrors: any[] = [];

    // Process each license that had a status change
    for (const license of (expiringLicenses as ExpiringLicense[]) || []) {
      try {
        // Only send notification if status changed to expiring_soon or expired
        if (license.new_status !== 'expiring_soon' && license.new_status !== 'expired') {
          continue;
        }

        // Check if we've already sent a notification for this status change
        const { data: existingNotif } = await supabase
          .from('user_notifications')
          .select('id')
          .eq('user_id', license.user_id)
          .eq('related_entity_type', 'business_license')
          .eq('related_entity_id', license.license_id)
          .eq('notification_type', 'service_update')
          .eq('update_type', 'renewal_reminder')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .single();

        if (existingNotif) {
          console.log(`Notification already sent for license ${license.license_number} in the last 24 hours`);
          continue;
        }

        // Update notification tracking - read current count first
        const { data: currentRow } = await supabase
          .from('business_license_applications')
          .select('renewal_reminder_count')
          .eq('id', license.license_id)
          .maybeSingle();

        const newCount = (currentRow?.renewal_reminder_count ?? 0) + 1;

        await supabase
          .from('business_license_applications')
          .update({
            renewal_notified_at: new Date().toISOString(),
            renewal_reminder_count: newCount,
          })
          .eq('id', license.license_id);

        // Prepare notification message
        const daysText = license.days_until_expiration === 1 
          ? '1 day' 
          : `${license.days_until_expiration} days`;

        let title: string;
        let message: string;

        if (license.new_status === 'expired') {
          title = 'Business License Expired';
          message = `Your business license #${license.license_number} has expired. Please renew it as soon as possible to avoid penalties.`;
        } else {
          title = 'Business License Renewal Reminder';
          message = `Your business license #${license.license_number} will expire in ${daysText}. Please renew your license before ${new Date(license.expires_at).toLocaleDateString()}.`;
        }

        // Call the unified notification function
        const notificationResponse = await supabase.functions.invoke('send-unified-notification', {
          body: {
            user_id: license.user_id,
            notification_type: 'service_update',
            title,
            message,
            service_type: 'business_license',
            service_number: license.license_number,
            update_type: 'renewal_reminder',
            status_change_from: license.old_status,
            status_change_to: license.new_status,
            related_entity_type: 'business_license',
            related_entity_id: license.license_id,
            action_url: `/business-licenses/${license.license_id}`,
            entity_details: {
              license_number: license.license_number,
              expires_at: license.expires_at,
              days_until_expiration: license.days_until_expiration,
              renewal_status: license.new_status
            },
            delivery_method: 'both'
          }
        });

        if (notificationResponse.error) {
          console.error(`Error sending notification for license ${license.license_number}:`, notificationResponse.error);
          notificationErrors.push({
            license_id: license.license_id,
            license_number: license.license_number,
            error: notificationResponse.error
          });
        } else {
          console.log(`Notification sent successfully for license ${license.license_number}`);
          notificationsSent.push({
            license_id: license.license_id,
            license_number: license.license_number,
            user_id: license.user_id,
            new_status: license.new_status,
            days_until_expiration: license.days_until_expiration
          });
        }
      } catch (error: any) {
        console.error(`Error processing license ${license.license_number}:`, error);
        notificationErrors.push({
          license_id: license.license_id,
          license_number: license.license_number,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          licenses_checked: expiringLicenses?.length || 0,
          notifications_sent: notificationsSent.length,
          notification_errors: notificationErrors.length
        },
        notifications_sent: notificationsSent,
        errors: notificationErrors
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
    console.error("Error in send-renewal-notifications function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
