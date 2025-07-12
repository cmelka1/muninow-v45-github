import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building2, Mail, Phone, MapPin, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const MunicipalProfile = () => {
  const { profile } = useAuth();

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Municipal Profile</h1>
        <p className="text-muted-foreground">
          Manage your municipal administrator profile and account settings.
        </p>
      </div>

      {/* Profile Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Administrator Information
            </CardTitle>
            <CardDescription>
              Your personal information as the municipal administrator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {profile?.first_name && profile?.last_name 
                      ? `${profile.first_name} ${profile.last_name}`
                      : 'Name not set'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{profile?.email || 'Email not available'}</p>
                  <p className="text-sm text-muted-foreground">Email Address</p>
                </div>
              </div>

              {profile?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{profile.phone}</p>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                  </div>
                </div>
              )}
            </div>

            <Button variant="outline" disabled className="w-full">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile (Coming Soon)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Municipality Assignment
            </CardTitle>
            <CardDescription>
              Your assigned municipality information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Municipal Administrator</p>
                  <p className="text-sm text-muted-foreground">Role</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {profile?.customer_id ? `Customer ID: ${profile.customer_id.slice(0, 8)}...` : 'Not assigned'}
                  </p>
                  <p className="text-sm text-muted-foreground">Municipality ID</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-primary font-medium mb-1">Administrator Access</p>
              <p className="text-xs text-muted-foreground">
                You have full access to manage bills, merchants, and team members for your municipality.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Manage your account preferences and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium">Security</h4>
              <ul className="space-y-2">
                <li className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Change Password</span>
                  <Button variant="ghost" size="sm" disabled>
                    Coming Soon
                  </Button>
                </li>
                <li className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Two-Factor Authentication</span>
                  <Button variant="ghost" size="sm" disabled>
                    Coming Soon
                  </Button>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Preferences</h4>
              <ul className="space-y-2">
                <li className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Email Notifications</span>
                  <Button variant="ghost" size="sm" disabled>
                    Coming Soon
                  </Button>
                </li>
                <li className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Dashboard Layout</span>
                  <Button variant="ghost" size="sm" disabled>
                    Coming Soon
                  </Button>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MunicipalProfile;