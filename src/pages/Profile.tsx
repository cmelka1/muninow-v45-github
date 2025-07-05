import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Edit2, Save, X, User, Mail, Phone, MapPin, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    streetAddress: profile?.street_address || '',
    city: profile?.city || '',
    state: profile?.state || '',
    zipCode: profile?.zip_code || '',
    businessName: profile?.business_legal_name || ''
  });

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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleSave = () => {
    // TODO: Implement profile update functionality
    console.log('Saving profile:', formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      email: user?.email || '',
      phone: profile?.phone || '',
      streetAddress: profile?.street_address || '',
      city: profile?.city || '',
      state: profile?.state || '',
      zipCode: profile?.zip_code || '',
      businessName: profile?.business_legal_name || ''
    });
    setIsEditing(false);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-gray-100">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Profile</h1>
            </div>

            <div className="space-y-6">
              {/* Profile Header */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-lg">
                      {getInitials(formData.firstName, formData.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {formData.firstName} {formData.lastName}
                    </h3>
                    <p className="text-gray-600">{formData.email}</p>
                    <Badge variant="secondary" className="mt-1">
                      {profile?.account_type === 'business' ? 'Business Account' : 'Resident Account'}
                    </Badge>
                  </div>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button onClick={handleSave} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

              {/* Personal Information */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

              {/* Address Information */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Information
                  </CardTitle>
                </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input
                  id="streetAddress"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({...formData, streetAddress: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

              {/* Business Information (if applicable) */}
              {profile?.account_type === 'business' && (
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Business Information
                    </CardTitle>
                  </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="businessName">Business Legal Name</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                  </CardContent>
                </Card>
              )}

              {/* Account Information */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Account Information</CardTitle>
                </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Account Type</Label>
                  <div className="mt-1">
                    <Badge variant="secondary">
                      {profile?.account_type === 'business' ? 'Business' : 'Resident'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Account Created</Label>
                  <div className="mt-1 text-sm text-gray-600">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
              <div>
                <Label>User ID</Label>
                <div className="mt-1 text-sm text-gray-600 font-mono">
                  {user?.id}
                </div>
              </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Profile;