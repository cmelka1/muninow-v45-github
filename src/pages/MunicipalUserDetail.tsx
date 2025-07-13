import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, MapPin, User } from 'lucide-react';
import UserBillsTable from '@/components/UserBillsTable';
import UserPaymentHistoryTable from '@/components/UserPaymentHistoryTable';
import { useUserProfile } from '@/hooks/useUserProfile';

const MunicipalUserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data: userProfile, isLoading, error } = useUserProfile(userId);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/municipal/search')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">User not found or access denied.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getAccountTypeBadge = (accountType: string) => {
    switch (accountType) {
      case 'resident':
        return <Badge variant="default">Resident</Badge>;
      case 'business':
        return <Badge variant="secondary">Business</Badge>;
      default:
        return <Badge variant="outline">{accountType}</Badge>;
    }
  };

  const formatAddress = (profile: any) => {
    const parts = [
      profile.street_address,
      profile.apt_number,
      profile.city,
      profile.state,
      profile.zip_code
    ].filter(Boolean);
    return parts.join(', ') || 'No address provided';
  };

  return (
    <div className="p-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/municipal/search')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">User Detail</h1>
      </div>

      {/* User Information Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Name</h3>
                <p className="text-gray-600">
                  {userProfile.first_name} {userProfile.last_name}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Account Type</h3>
                {getAccountTypeBadge(userProfile.account_type)}
              </div>
              {userProfile.business_legal_name && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Business Name</h3>
                  <p className="text-gray-600">{userProfile.business_legal_name}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600">{userProfile.email}</p>
                </div>
              </div>
              {userProfile.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Phone</h3>
                    <p className="text-gray-600">{userProfile.phone}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Address</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {formatAddress(userProfile)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Bills Section */}
      <div className="mb-6">
        <UserBillsTable userId={userId!} />
      </div>

      {/* User Payment History Section */}
      <div>
        <UserPaymentHistoryTable userId={userId!} />
      </div>
    </div>
  );
};

export default MunicipalUserDetail;