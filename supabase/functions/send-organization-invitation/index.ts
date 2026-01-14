
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { Logger } from '../shared/logger.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { invitation_email, role, organization_type } = await req.json();

    if (!invitation_email || !role || !organization_type) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Auth Check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) return new Response(JSON.stringify({ success: false, error: 'Invalid authentication' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Profile Check
    const { data: adminProfile } = await supabase.from('profiles').select('first_name, last_name, account_type').eq('id', user.id).single();
    if (!adminProfile) return new Response(JSON.stringify({ success: false, error: 'Profile not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    if (adminProfile.account_type !== organization_type) {
      return new Response(JSON.stringify({ success: false, error: 'Admin account type mismatch' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin_name = `${adminProfile.first_name} ${adminProfile.last_name}`;

    // Create DB Record
    const { data: invitation, error: invitationError } = await supabase
      .from('organization_invitations')
      .insert({
        organization_admin_id: user.id,
        invitation_email,
        role,
        organization_type,
        invitation_token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (invitationError) throw invitationError;

    // Send Email (Fetch to Resend)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
        Logger.info(`Sending invitation to ${invitation_email}`);
        
        await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                from: "MuniNow Invites <invites@resend.dev>",
                to: [invitation_email],
                subject: `Invitation to join ${organization_type} on MuniNow`,
                html: `
                    <p>Hello,</p>
                    <p><strong>${admin_name}</strong> has invited you to join their ${organization_type} on MuniNow.</p>
                    <p>Role: ${role}</p>
                    <p><a href="https://muninow.com/accept-invite?token=${invitation.invitation_token}">Click here to accept</a></p>
                `
            }),
        });

        // Update DB status
        await supabase.from('organization_invitations').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', invitation.id);
    } else {
        Logger.warn("RESEND_API_KEY missing - email skipped");
    }

    return new Response(
      JSON.stringify({ success: true, invitation_id: invitation.id, message: 'Invitation sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    Logger.error('Error in send-organization-invitation', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});