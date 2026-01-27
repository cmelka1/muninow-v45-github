import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, UserPlus, MoreVertical, Shield, User, Trash2 } from 'lucide-react';
import { useMunicipalTeamMembers } from '@/hooks/useMunicipalTeamMembers';
import { MunicipalInviteMemberDialog } from '@/components/MunicipalInviteMemberDialog';
import { toast } from '@/hooks/use-toast';

const MunicipalMembers = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { members, isLoading, inviteMember, removeMember, updateMemberRole } = useMunicipalTeamMembers();

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const adminCount = members.filter(member => member.role === 'admin').length;
  const userCount = members.filter(member => member.role === 'user').length;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      await removeMember(memberId);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'user') => {
    await updateMemberRole(memberId, newRole);
  };

  return (
    <>
      <Helmet>
        <title>Members | MuniNow</title>
      </Helmet>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">
            Manage your municipal team and their access levels
          </p>
        </div>
      </div>

      <div>
        {/* Send Invitations Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Send Invitations
              </CardTitle>
              <MunicipalInviteMemberDialog onInvite={inviteMember} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{members.length}</div>
                <div className="text-sm text-muted-foreground">Total Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{adminCount}</div>
                <div className="text-sm text-muted-foreground">Administrators</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading team members...</div>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
              <p className="text-muted-foreground">
                Use the invitation card above to start adding team members to your municipal organization.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(member.first_name, member.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {member.first_name} {member.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="flex items-center gap-1">
                      {member.role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {member.role === 'admin' ? 'Administrator' : 'User'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         {member.role === 'admin' ? (
                           <>
                             <DropdownMenuItem disabled className="text-muted-foreground">
                               <Shield className="h-4 w-4 mr-2" />
                               Contact SuperAdmin for role changes
                             </DropdownMenuItem>
                           </>
                         ) : (
                           <>
                             <DropdownMenuItem onClick={() => handleUpdateRole(member.member_id, 'admin')}>
                               <Shield className="h-4 w-4 mr-2" />
                               Promote to Admin
                             </DropdownMenuItem>
                             <DropdownMenuItem 
                               onClick={() => handleRemoveMember(member.member_id)}
                               className="text-destructive"
                             >
                               <Trash2 className="h-4 w-4 mr-2" />
                               Remove Member
                             </DropdownMenuItem>
                           </>
                         )}
                       </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default MunicipalMembers;