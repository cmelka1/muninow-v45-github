import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Users, Mail, Phone, UserMinus, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { InviteMemberDialog } from '@/components/InviteMemberDialog';

const Members = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();
  const { members, isLoading: membersLoading, inviteMember, removeMember, updateMemberRole } = useOrganizationMembers();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/signin');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getOrganizationLabel = () => {
    switch (profile?.account_type) {
      case 'business': return { singular: 'team member', plural: 'team members' };
      case 'municipal': return { singular: 'organization member', plural: 'organization members' };
      default: return { singular: 'household member', plural: 'household members' };
    }
  };

  const organizationLabels = getOrganizationLabel();
  
  const adminCount = members.filter(m => m.role === 'admin').length;
  const userCount = members.filter(m => m.role === 'user').length;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleRemoveMember = async (memberId: string) => {
    await removeMember(memberId);
  };

  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'user') => {
    await updateMemberRole(memberId, newRole);
  };

  return (
    <SidebarProvider>
      <Helmet>
        <title>Members | MuniNow</title>
      </Helmet>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-gray-100">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
              <div className="mb-6 md:mb-8">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Members</h1>
                  <p className="text-gray-600">
                    Manage {organizationLabels.plural} and their access.
                  </p>
                </div>
              </div>

            {/* Main Action Tiles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Send Invitations Tile */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Send Invitations
                  </CardTitle>
                  <p className="text-gray-600">
                    Invite new {organizationLabels.plural} to join your{' '}
                    {profile?.account_type === 'business' ? 'team' : 
                     profile?.account_type === 'municipal' ? 'organization' : 'household'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{members.length}</div>
                      <div className="text-sm text-blue-600">Total Members</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{adminCount}</div>
                      <div className="text-sm text-green-600">Admins</div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <InviteMemberDialog onInvite={inviteMember} />
                  </div>

                  {members.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No {organizationLabels.plural} yet.</p>
                      <p className="text-xs">Send your first invitation to get started.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Manage Organization Tile */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Manage {profile?.account_type === 'business' ? 'Team' : 
                            profile?.account_type === 'municipal' ? 'Organization' : 'Household'}
                  </CardTitle>
                  <p className="text-gray-600">
                    Control member roles and manage your organization
                  </p>
                </CardHeader>
                <CardContent>
                  {membersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No members to manage yet.</p>
                      <p className="text-xs">Send invitations to start building your {getOrganizationLabel().singular} group.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{getInitials(member.first_name, member.last_name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 text-sm truncate">
                                {member.first_name} {member.last_name}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {member.role === 'admin' && <Shield className="h-3 w-3" />}
                                <span>{member.role === 'admin' ? 'Admin' : 'Member'}</span>
                                <span className="text-green-600">• Active</span>
                              </div>
                            </div>
                          </div>
                          
                          {member.member_id !== user?.id && (
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleUpdateRole(member.member_id, member.role === 'admin' ? 'user' : 'admin')}
                              >
                                {member.role === 'admin' ? 'Demote' : 'Promote'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleRemoveMember(member.member_id)}
                              >
                                <UserMinus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Members;