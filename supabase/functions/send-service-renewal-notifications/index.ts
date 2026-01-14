import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { sendUnifiedNotification } from '../shared/notificationUtils.ts';
import { Logger } from '../shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpiringApplication {
  application_id: string;
  user_id: string;
  application_number: string;
  service_name: string;
  expires_at: string;
  days_until_expiration: number;
  old_status: string;
  new_status: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    Logger.info('Starting service application renewal notification check...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: expiringApps, error: checkError } = await supabase
      .rpc('check_expiring_service_applications');

    if (checkError) {
      Logger.error('Error checking expiring applications', checkError);
      throw checkError;
    }

    Logger.info(`Found ${expiringApps?.length || 0} applications to process`);

    const notificationsSent: any[] = [];
    const notificationErrors: any[] = [];

    for (const app of (expiringApps as ExpiringApplication[]) || []) {
      try {
        // Only notify for expiring_soon or expired
        if (app.new_status !== 'expiring_soon' && app.new_status !== 'expired') {
          continue;
        }

        // Check 24h cooldown
        const { data: existingNotif } = await supabase
          .from('user_notifications')
          .select('id')
          .eq('user_id', app.user_id)
          .eq('related_entity_type', 'service_application')
          .eq('related_entity_id', app.application_id)
          .eq('notification_type', 'service_update')
          .eq('update_type', 'renewal_reminder')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (existingNotif) {
          Logger.info(`Notification already sent for application ${app.application_number} in last 24h`);
          continue;
        }

        // Update reminder count
        const { data: currentRow } = await supabase
          .from('municipal_service_applications')
          .select('renewal_reminder_count')
          .eq('id', app.application_id)
          .maybeSingle();

        const newCount = (currentRow?.renewal_reminder_count ?? 0) + 1;

        await supabase
          .from('municipal_service_applications')
          .update({
            renewal_notified_at: new Date().toISOString(),
            renewal_reminder_count: newCount,
          })
          .eq('id', app.application_id);

        // Prepare message
        const daysText = app.days_until_expiration === 1 
          ? '1 day' 
          : `${app.days_until_expiration} days`;
        
        let title: string;
        let message: string;

        if (app.new_status === 'expired') {
          title = `${app.service_name || 'Service'} Expired`;
          message = `Your application #${app.application_number} has expired. Please renew it as soon as possible.`;
        } else {
          title = `${app.service_name || 'Service'} Renewal Reminder`;
          message = `Your application #${app.application_number} will expire in ${daysText}. Please renew before ${new Date(app.expires_at).toLocaleDateString()}.`;
        }

        const notificationInput = {
          user_id: app.user_id,
          notification_type: 'service_update' as const,
          title,
          message,
          service_type: 'service_application',
          service_number: app.application_number,
          update_type: 'renewal_reminder',
          status_change_from: app.old_status,
          status_change_to: app.new_status,
          related_entity_type: 'service_application',
          related_entity_id: app.application_id,
          action_url: `/service-applications/${app.application_id}`,
          entity_details: {
            application_number: app.application_number,
            service_name: app.service_name,
            expires_at: app.expires_at,
            days_until_expiration: app.days_until_expiration,
            renewal_status: app.new_status
          },
          delivery_method: 'both' // Email + In-App
        };

        const result = await sendUnifiedNotification(supabase, notificationInput);

        if (!result.success) {
          Logger.error(`Error sending notification for app ${app.application_number}`, result.error);
          notificationErrors.push({
            id: app.application_id,
            error: result.error
          });
        } else {
          Logger.info(`Notification sent for app ${app.application_number}`);
          notificationsSent.push({
            id: app.application_id,
            status: app.new_status
          });
        }

      } catch (error: any) {
        Logger.error(`Error processing app ${app.application_number}`, error);
        notificationErrors.push({
          id: app.application_id,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          checked: expiringApps?.length || 0,
          sent: notificationsSent.length,
          errors: notificationErrors.length
        },
        sent: notificationsSent,
        errors: notificationErrors
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    Logger.error("Error in send-service-renewal-notifications", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
