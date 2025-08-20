import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, User, Calendar, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MunicipalLayout } from '@/components/layouts/MunicipalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useBusinessLicense } from '@/hooks/useBusinessLicense';
import { BusinessLicenseStatusBadge } from '@/components/BusinessLicenseStatusBadge';
import { BusinessLicenseCommunication } from '@/components/BusinessLicenseCommunication';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { formatEINForDisplay } from '@/lib/formatters';

export const BusinessLicenseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: license, isLoading, error } = useBusinessLicense(id!);
  
  const isMunicipalUser = user?.user_metadata?.account_type === 'municipal';

  const handleBack = () => {
    if (isMunicipalUser) {
      navigate('/municipal/business-licenses');
    } else {
      navigate('/business-licenses');
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        {isMunicipalUser ? (
          <MunicipalLayout>
            <div className="p-6">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="h-48 bg-gray-200 rounded"></div>
                    <div className="h-48 bg-gray-200 rounded"></div>
                  </div>
                  <div className="space-y-6">
                    <div className="h-32 bg-gray-200 rounded"></div>
                    <div className="h-48 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </MunicipalLayout>
        ) : (
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <AppSidebar />
              <main className="flex-1 overflow-auto bg-gray-100">
                <div className="p-6">
                  <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="h-48 bg-gray-200 rounded"></div>
                        <div className="h-48 bg-gray-200 rounded"></div>
                      </div>
                      <div className="space-y-6">
                        <div className="h-32 bg-gray-200 rounded"></div>
                        <div className="h-48 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </SidebarProvider>
        )}
      </div>
    );
  }

  if (error || !license) {
    return (
      <div className="min-h-screen bg-gray-100">
        {isMunicipalUser ? (
          <MunicipalLayout>
            <div className="p-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">License Not Found</h3>
                    <p className="text-gray-600 mb-4">The requested business license could not be found.</p>
                    <Button onClick={handleBack}>Go Back</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </MunicipalLayout>
        ) : (
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <AppSidebar />
              <main className="flex-1 overflow-auto bg-gray-100">
                <div className="p-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">License Not Found</h3>
                        <p className="text-gray-600 mb-4">The requested business license could not be found.</p>
                        <Button onClick={handleBack}>Go Back</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </main>
            </div>
          </SidebarProvider>
        )}
      </div>
    );
  }

  const PageContent = () => (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Business License #{license.license_number || license.id.slice(0, 8)}
            </h1>
            <p className="text-gray-600">{license.business_legal_name}</p>
          </div>
          <BusinessLicenseStatusBadge status={license.application_status} />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* License Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                License Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">License Type</label>
                  <p className="text-sm">{license.business_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <BusinessLicenseStatusBadge status={license.application_status} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Application Date</label>
                  <p className="text-sm">{formatDate(license.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted Date</label>
                  <p className="text-sm">{formatDate(license.submitted_at)}</p>
                </div>
              </div>
              
              {license.business_description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Business Description</label>
                  <p className="text-sm mt-1">{license.business_description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Legal Name</label>
                  <p className="text-sm">{license.business_legal_name}</p>
                </div>
                {license.doing_business_as && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">DBA</label>
                    <p className="text-sm">{license.doing_business_as}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Business Type</label>
                  <p className="text-sm">{license.business_type}</p>
                </div>
                {license.federal_ein && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Federal EIN</label>
                    <p className="text-sm">{formatEINForDisplay(license.federal_ein)}</p>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Business Address</label>
                <p className="text-sm mt-1">
                  {license.business_street_address}
                  {license.business_apt_number && `, ${license.business_apt_number}`}
                  <br />
                  {license.business_city}, {license.business_state} {license.business_zip_code}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {license.business_phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-sm">{license.business_phone}</p>
                  </div>
                )}
                {license.business_email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm">{license.business_email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Owner Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Owner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-sm">{license.owner_first_name} {license.owner_last_name}</p>
                </div>
                {license.owner_title && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Title</label>
                    <p className="text-sm">{license.owner_title}</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="text-sm mt-1">
                  {license.owner_street_address}
                  {license.owner_apt_number && `, ${license.owner_apt_number}`}
                  <br />
                  {license.owner_city}, {license.owner_state} {license.owner_zip_code}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {license.owner_phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-sm">{license.owner_phone}</p>
                  </div>
                )}
                {license.owner_email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm">{license.owner_email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Fee Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Fee Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Base Fee</span>
                <span className="text-sm font-medium">{formatCurrency(license.base_fee_cents)}</span>
              </div>
              {license.service_fee_cents > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Service Fee</span>
                  <span className="text-sm font-medium">{formatCurrency(license.service_fee_cents)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Total Amount</span>
                <span className="font-medium">{formatCurrency(license.total_fee_cents)}</span>
              </div>
              <div className="mt-2">
                <Badge variant={license.payment_status === 'paid' ? 'default' : 'secondary'}>
                  {license.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Created</span>
                  <span className="text-gray-600">{formatDate(license.created_at)}</span>
                </div>
                {license.submitted_at && (
                  <div className="flex justify-between text-sm">
                    <span>Submitted</span>
                    <span className="text-gray-600">{formatDate(license.submitted_at)}</span>
                  </div>
                )}
                {license.under_review_at && (
                  <div className="flex justify-between text-sm">
                    <span>Under Review</span>
                    <span className="text-gray-600">{formatDate(license.under_review_at)}</span>
                  </div>
                )}
                {license.information_requested_at && (
                  <div className="flex justify-between text-sm">
                    <span>Info Requested</span>
                    <span className="text-gray-600">{formatDate(license.information_requested_at)}</span>
                  </div>
                )}
                {license.approved_at && (
                  <div className="flex justify-between text-sm">
                    <span>Approved</span>
                    <span className="text-gray-600">{formatDate(license.approved_at)}</span>
                  </div>
                )}
                {license.issued_at && (
                  <div className="flex justify-between text-sm">
                    <span>Issued</span>
                    <span className="text-gray-600">{formatDate(license.issued_at)}</span>
                  </div>
                )}
                {license.denied_at && (
                  <div className="flex justify-between text-sm">
                    <span>Denied</span>
                    <span className="text-gray-600">{formatDate(license.denied_at)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Communication */}
          <BusinessLicenseCommunication licenseId={license.id} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {isMunicipalUser ? (
        <MunicipalLayout>
          <PageContent />
        </MunicipalLayout>
      ) : (
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <main className="flex-1 overflow-auto bg-gray-100">
              <PageContent />
            </main>
          </div>
        </SidebarProvider>
      )}
    </div>
  );
};