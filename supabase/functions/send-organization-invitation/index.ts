import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
// import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
// const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function getOrganizationLabels(type: string) {
  switch (type) {
    case 'residentadmin':
    case 'residentuser':
      return {
        org: 'Household',
        team: 'household',
        action: 'managing household services',
        description: 'Join your household to manage permits, licenses, and other municipal services together.'
      };
    case 'businessadmin':
    case 'businessuser':
      return {
        org: 'Business',
        team: 'business',
        action: 'managing business operations',
        description: 'Collaborate with your business team to handle licenses, permits, and municipal requirements.'
      };
    default:
      return {
        org: 'Organization',
        team: 'organization',
        action: 'collaborating',
        description: 'Join your organization to work together on municipal services and requirements.'
      };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invitation_email, role, organization_type } = await req.json();

    if (!invitation_email || !role || !organization_type) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: invitation_email, role, and organization_type are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get current user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin profile
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, account_type')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin has permission to invite
    if (adminProfile.account_type !== organization_type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin account type must match organization type' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const admin_name = `${adminProfile.first_name} ${adminProfile.last_name}`;

    // Create invitation record
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

    if (invitationError) {
      console.error("Error creating invitation:", invitationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email sending disabled (resend package issues)
    console.log("Invitation created but email sending disabled");

    // Update invitation record with email sent status
    const { error: updateError } = await supabase
      .from('organization_invitations')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error("Error updating invitation status:", updateError);
      // Don't fail the request for this
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        invitation_id: invitation.id,
        message: 'Invitation created successfully. Email functionality temporarily disabled.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-organization-invitation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});