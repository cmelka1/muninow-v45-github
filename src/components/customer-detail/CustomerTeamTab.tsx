import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SuperAdminInviteMunicipalDialog } from '@/components/SuperAdminInviteMunicipalDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Mail, Users, Clock, CheckCircle, XCircle, AlertCircle, Trash2, Ban } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CustomerTeamTabProps {
  customerId: string;
  customerName: string;
}

interface Invitation {
  id: string;
  invitation_email: string;
  role: string;
  status: string;
  invited_at: string;
  expires_at: string | null;
  activated_at?: string | null;
}

interface TeamMember {
  id: string;
  member_id: string;
  role: string;
  status: string;
  joined_at: string;
  first_name: string;
  last_name: string;
  email: string;
  account_type: string;
}

const CustomerTeamTab: React.FC<CustomerTeamTabProps> = ({ customerId, customerName }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const loadInvitations = async () => {
    setIsLoadingInvitations(true);
    try {
      const { data, error } = await supabase.rpc('get_customer_invitations', {
        p_customer_id: customerId
      });
      if (error) throw error;
      setInvitations((data || []) as Invitation[]);
    } catch (error: unknown) {
      console.error('Error loading invitations:', error);
      toast({
        title: "Error",
        description: "Failed to load invitations",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const loadTeamMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const { data, error } = await supabase.rpc('get_customer_team_members', {
        p_customer_id: customerId
      });
      if (error) throw error;
      setTeamMembers((data || []) as TeamMember[]);
    } catch (error: unknown) {
      console.error('Error loading team members:', error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      loadInvitations();
      loadTeamMembers();
    }
  }, [customerId]);

  const handleInviteSent = () => {
    loadInvitations();
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      const { error } = await (supabase.rpc as Function)('remove_municipal_team_member', {
        p_customer_id: customerId,
        p_member_id: memberId
      });
      if (error) throw error;
      toast({
        title: "Member Removed",
        description: `${memberName} has been removed from the team`,
      });
      loadTeamMembers();
    } catch (error: unknown) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    try {
      const { error } = await (supabase.rpc as Function)('revoke_municipal_invitation', {
        p_invitation_id: invitationId
      });
      if (error) throw error;
      toast({
        title: "Invitation Revoked",
        description: `Invitation to ${email} has been revoked`,
      });
      loadInvitations();
    } catch (error: unknown) {
      console.error('Error revoking invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to revoke invitation",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, activatedAt?: string | null) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepted{activatedAt && ` ${formatDate(activatedAt)}`}
          </Badge>
        );
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    return role === 'admin' 
      ? <Badge className="bg-purple-100 text-purple-700 border-purple-200">Admin</Badge>
      : <Badge variant="secondary">User</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Invite Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Municipal Team</h2>
          <p className="text-sm text-muted-foreground">Manage users who can access this municipality's dashboard</p>
        </div>
        <SuperAdminInviteMunicipalDialog 
          customerId={customerId} 
          customerName={customerName} 
          onInviteSent={handleInviteSent}
        />
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members ({teamMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingMembers ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No team members yet. Send an invitation to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.first_name} {member.last_name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(member.role)}
                    <span className="text-xs text-muted-foreground">
                      Joined {formatDate(member.joined_at)}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {member.first_name} {member.last_name}'s access to {customerName}'s municipal dashboard. They will no longer be able to manage permits, licenses, or payments.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveMember(member.member_id, `${member.first_name} ${member.last_name}`)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invitations ({invitations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingInvitations ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No invitations sent yet.
            </p>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{inv.invitation_email}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent {formatDate(inv.invited_at)}
                      {inv.expires_at && inv.status === 'pending' && (
                        <> · Expires {formatDate(inv.expires_at)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(inv.role)}
                    {getStatusBadge(inv.status, inv.activated_at)}
                    {inv.status === 'pending' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Ban className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will revoke the invitation to {inv.invitation_email}. They will no longer be able to use this invitation link to sign up.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevokeInvitation(inv.id, inv.invitation_email)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerTeamTab;

