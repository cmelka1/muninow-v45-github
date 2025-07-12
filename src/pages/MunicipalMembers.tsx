import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Shield, User } from 'lucide-react';

const MunicipalMembers = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
        <p className="text-muted-foreground">
          Manage your municipal team members and invite additional users to access the portal.
        </p>
      </div>

      {/* Current Admin Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Current Administrator
          </CardTitle>
          <CardDescription>
            You are the administrator for this municipality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Municipal Administrator</p>
              <p className="text-sm text-muted-foreground">
                Full access to all municipal data and team management
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Invitation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Members
          </CardTitle>
          <CardDescription>
            Invite additional municipal staff to access the portal (invitation-only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Team Invitation System</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Coming soon - Invite municipal staff members to access specific sections of the portal
            </p>
            <Button disabled variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Team Member
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Management Features */}
      <Card>
        <CardHeader>
          <CardTitle>Team Management Features</CardTitle>
          <CardDescription>
            Planned functionality for managing municipal team access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium text-green-600">✓ Current Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Single administrator per municipality
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Database structure for team members
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-amber-600">⏳ Coming Soon</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-amber-500" />
                  Email invitation system
                </li>
                <li className="flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-500" />
                  Role-based access control
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-500" />
                  Team member management interface
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MunicipalMembers;