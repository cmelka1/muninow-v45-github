
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
    const body = await req.json();
    const { 
      invitation_email, 
      invitation_token,
      role, 
      organization_type,
      customer_id,
      customer_name,
      invitation_id  // If provided, we're sending email for an existing invitation
    } = body;

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

    // Allow SuperAdmins to send municipal invitations
    const isSuperAdmin = adminProfile.account_type === 'superadmin';
    if (!isSuperAdmin && adminProfile.account_type !== organization_type) {
      return new Response(JSON.stringify({ success: false, error: 'Admin account type mismatch' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin_name = `${adminProfile.first_name} ${adminProfile.last_name}`;
    let token = invitation_token;
    let invitationRecord = null;

    // If invitation_id is provided, use existing invitation, otherwise create new one
    if (invitation_id && invitation_token) {
      // SuperAdmin flow: invitation already created via RPC, just send email
      token = invitation_token;
      invitationRecord = { id: invitation_id, invitation_token: token };
    } else {
      // Legacy flow: create invitation record
      const { data: invitation, error: invitationError } = await supabase
        .from('organization_invitations')
        .insert({
          organization_admin_id: user.id,
          invitation_email,
          role,
          organization_type,
          customer_id: customer_id || null,
          invitation_token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (invitationError) throw invitationError;
      invitationRecord = invitation;
      token = invitation.invitation_token;
    }

    // Determine signup URL based on organization type
    const baseUrl = Deno.env.get("SITE_URL") || "https://muninow.com";
    const signupUrl = organization_type === 'municipal'
      ? `${baseUrl}/municipal/signup?invitation=${token}`
      : `${baseUrl}/signup?invitation=${token}`;

    // Build email content
    const organizationName = customer_name || organization_type;
    const roleDisplay = role === 'admin' ? 'Administrator' : 'User';

    // Send Email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    // Use configured from address, or use verified muninow.com domain
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "MuniNow <contact@muninow.com>";
    
    if (resendApiKey) {
        Logger.info(`Sending invitation to ${invitation_email}`);
        
        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                from: fromEmail,
                to: [invitation_email],
                subject: `You've been invited to join ${organizationName} on MuniNow`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a56db;">You're Invited!</h2>
                        <p>Hello,</p>
                        <p><strong>${admin_name}</strong> has invited you to join <strong>${organizationName}</strong> on MuniNow as a <strong>${roleDisplay}</strong>.</p>
                        ${organization_type === 'municipal' ? '<p>You will have access to the municipal dashboard to manage permits, licenses, and payments.</p>' : ''}
                        <p style="margin: 24px 0;">
                            <a href="${signupUrl}" style="background-color: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Accept Invitation
                            </a>
                        </p>
                        <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
                        <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
                    </div>
                `
            }),
        });

        const emailResult = await emailResponse.json();
        
        if (!emailResponse.ok) {
            Logger.error(`Resend API error: ${JSON.stringify(emailResult)}`);
            // Don't throw - invitation was created, just log the email failure
        } else {
            Logger.info(`Email sent successfully: ${emailResult.id}`);
            // Update DB status
            await supabase.from('organization_invitations').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', invitationRecord.id);
        }
    } else {
        Logger.warn("RESEND_API_KEY missing - email skipped");
    }

    return new Response(
      JSON.stringify({ success: true, invitation_id: invitationRecord.id, message: 'Invitation sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    Logger.error('Error in send-organization-invitation', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
