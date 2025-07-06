import React, { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SuperAdminCustomers = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    accountType: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    streetAddress: '',
    aptNumber: '',
    city: '',
    state: '',
    zipCode: '',
    businessLegalName: '',
    industry: '',
    municipalityName: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const getRoleForAccountType = (accountType: string) => {
    switch (accountType) {
      case 'resident': return 'residentAdmin';
      case 'business': return 'businessAdmin';
      case 'municipal': return 'municipalAdmin';
      default: return 'residentUser';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const password = generatePassword();
      const redirectUrl = `${window.location.origin}/`;

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            street_address: formData.streetAddress,
            apt_number: formData.aptNumber,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zipCode,
            account_type: formData.accountType,
            role: 'admin',
            business_legal_name: formData.businessLegalName || null,
            industry: formData.industry || null,
            municipality_name: formData.municipalityName || null
          }
        }
      });

      if (authError) throw authError;

      // Assign role to user
      if (authData.user) {
        const role = getRoleForAccountType(formData.accountType);
        const { error: roleError } = await supabase.rpc('assign_role_to_user', {
          _user_id: authData.user.id,
          _role_name: role
        });

        if (roleError) {
          console.error('Role assignment error:', roleError);
        }
      }

      toast({
        title: "Customer created successfully",
        description: `Account created for ${formData.firstName} ${formData.lastName}. Credentials: ${formData.email} / ${password}`,
      });

      // Reset form
      setFormData({
        accountType: '',
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        streetAddress: '',
        aptNumber: '',
        city: '',
        state: '',
        zipCode: '',
        businessLegalName: '',
        industry: '',
        municipalityName: ''
      });

    } catch (error) {
      console.error('Customer creation error:', error);
      toast({
        title: "Error creating customer",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showBusinessFields = formData.accountType === 'business';
  const showMunicipalFields = formData.accountType === 'municipal';

  return (
    <SuperAdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Customers
          </h1>
          <p className="text-gray-600">
            Onboard new customers to the platform
          </p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Create New Customer Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type</Label>
                <Select 
                  value={formData.accountType} 
                  onValueChange={(value) => handleInputChange('accountType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resident">Resident</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="municipal">Municipal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Address Information</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="streetAddress">Street Address</Label>
                    <Input
                      id="streetAddress"
                      value={formData.streetAddress}
                      onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aptNumber">Apt/Unit</Label>
                    <Input
                      id="aptNumber"
                      value={formData.aptNumber}
                      onChange={(e) => handleInputChange('aptNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Business-specific fields */}
              {showBusinessFields && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Business Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessLegalName">Business Legal Name</Label>
                    <Input
                      id="businessLegalName"
                      value={formData.businessLegalName}
                      onChange={(e) => handleInputChange('businessLegalName', e.target.value)}
                      required={showBusinessFields}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Municipal-specific fields */}
              {showMunicipalFields && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Municipal Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="municipalityName">Municipality Name</Label>
                    <Input
                      id="municipalityName"
                      value={formData.municipalityName}
                      onChange={(e) => handleInputChange('municipalityName', e.target.value)}
                      required={showMunicipalFields}
                    />
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || !formData.accountType || !formData.email || !formData.firstName || !formData.lastName}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Customer Account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminCustomers;