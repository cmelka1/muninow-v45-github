import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface MunicipalTeamMember {
  id: string;
  member_id: string;
  role: 'admin' | 'user';
  joined_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
}

export const useMunicipalTeamMembers = () => {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<MunicipalTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMembers = async () => {
    if (!profile?.customer_id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_municipal_team_members', {
        p_customer_id: profile.customer_id
      });

      if (error) throw error;
      setMembers((data || []) as MunicipalTeamMember[]);
    } catch (error) {
      console.error('Error loading municipal team members:', error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inviteMember = async (email: string, role: 'admin' | 'user'): Promise<boolean> => {
    if (!profile?.customer_id) return false;

    try {
      // Create invitation
      const { data: invitationId, error: inviteError } = await supabase.rpc('create_municipal_team_invitation', {
        p_customer_id: profile.customer_id,
        p_invitation_email: email,
        p_role: role
      });

      if (inviteError) throw inviteError;

      // Get invitation details for email
      const { data: invitation, error: fetchError } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError) throw fetchError;

      // Get admin profile for email
      const { data: adminProfile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, business_legal_name')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-organization-invitation', {
        body: {
          invitationId: invitation.id,
          invitationEmail: invitation.invitation_email,
          invitationToken: invitation.invitation_token,
          role: invitation.role,
          organizationType: invitation.organization_type,
          adminFirstName: adminProfile.first_name,
          adminLastName: adminProfile.last_name,
          organizationName: adminProfile.business_legal_name || 'Municipal Organization'
        }
      });

      if (emailError) throw emailError;

      toast({
        title: "Success",
        description: `Invitation sent to ${email}`,
      });

      await loadMembers();
      return true;
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeMember = async (memberId: string): Promise<void> => {
    if (!profile?.customer_id) return;

    try {
      const { error } = await supabase.rpc('remove_municipal_team_member', {
        p_customer_id: profile.customer_id,
        p_member_id: memberId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member removed",
      });

      await loadMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive",
      });
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'admin' | 'user'): Promise<void> => {
    if (!profile?.customer_id) return;

    try {
      const { error } = await supabase.rpc('update_municipal_team_member_role', {
        p_customer_id: profile.customer_id,
        p_member_id: memberId,
        p_new_role: newRole
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role updated successfully",
      });

      await loadMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      loadMembers();
    }
  }, [user]);

  return {
    members,
    isLoading,
    loadMembers,
    inviteMember,
    removeMember,
    updateMemberRole,
  };
};