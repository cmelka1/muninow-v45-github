import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, MapPin, User, AlertCircle } from 'lucide-react';
import UserBillsTable from '@/components/UserBillsTable';
import UserPaymentHistoryTable from '@/components/UserPaymentHistoryTable';
import { useMunicipalUserSummary } from '@/hooks/useMunicipalUserSummary';

const MunicipalUserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const { data: userSummary, isLoading, error } = useMunicipalUserSummary(userId);
  
  const profile = userSummary ? {
    id: userSummary.user_id,
    first_name: userSummary.first_name,
    last_name: userSummary.last_name,
    email: userSummary.email,
    phone: userSummary.phone,
    street_address: userSummary.street_address,
    apt_number: userSummary.apt_number,
    city: userSummary.city,
    state: userSummary.state,
    zip_code: userSummary.zip_code,
    account_type: userSummary.account_type,
    business_legal_name: userSummary.business_legal_name,
    created_at: userSummary.created_at,
    updated_at: userSummary.updated_at,
  } : null;
  
  const userInfo = profile;
  const hasProfileAccess = !!userSummary?.has_bills;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse w-24"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse w-32"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => navigate('/municipal/search')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive">User not found or no bills exist for this municipality.</p>
            </CardContent>
          </Card>
        </div>
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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/municipal/search')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
          <h1 className="text-2xl font-bold">User Details</h1>
        </div>

        {/* User Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              User Information
              {!hasProfileAccess && (
                <Badge variant="secondary" className="ml-2">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Bill Data Only
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-base">
                  {userInfo.first_name && userInfo.last_name 
                    ? `${userInfo.first_name} ${userInfo.last_name}`
                    : 'Name not available'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                <div className="mt-1">
                  {userInfo.account_type ? getAccountTypeBadge(userInfo.account_type) : <Badge variant="outline">Unknown</Badge>}
                </div>
              </div>
              {userInfo.business_legal_name && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Business Name</label>
                  <p className="text-base">{userInfo.business_legal_name}</p>
                </div>
              )}
              {userInfo.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-base">{userInfo.email}</p>
                </div>
              )}
              {userInfo.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-base">{userInfo.phone}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <p className="text-base">{formatAddress(userInfo)}</p>
              </div>
              {userSummary && (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Bills Count</label>
                    <p className="text-base">{userSummary.bill_count} bills</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Amount Due</label>
                    <p className="text-base">${(userSummary.total_amount_due_cents / 100).toFixed(2)}</p>
                  </div>
                </>
              )}
            </div>
            
            {!hasProfileAccess && (
              <div className="mt-6 p-4 bg-muted/30 border border-muted rounded-md">
                <p className="text-sm text-muted-foreground flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Showing limited information from bill data. Full profile access may be restricted.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Bills Section */}
        <div>
          <UserBillsTable userId={userId!} />
        </div>

        {/* User Payment History Section */}
        <div>
          <UserPaymentHistoryTable userId={userId!} />
        </div>
      </div>
    </div>
  );
};

export default MunicipalUserDetail;