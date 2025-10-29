import React, { useState } from 'react';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, User, MapPin, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePermit } from '@/hooks/usePermit';
import { usePermitNotifications } from '@/hooks/usePermitNotifications';
import { PermitStatusBadge } from '@/components/PermitStatusBadge';
import { getStatusDisplayName, getStatusDescription, PermitStatus } from '@/hooks/usePermitWorkflow';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';

const PermitOverview = () => {
  const { permitId } = useParams<{ permitId: string }>();
  const navigate = useNavigate();
  
  const { data: permit, isLoading, error } = usePermit(permitId!);
  const { notifications } = usePermitNotifications();

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatCurrency = (cents: number | null) => {
    if (cents === null || cents === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !permit) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => navigate('/permits')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive">Error loading permit details. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Filter notifications for this permit
  const permitNotifications = notifications.filter(n => n.permit_id === permit.permit_id);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/permits')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Permit Details</h1>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Permit Information */}
          <div className="lg:col-span-8 space-y-6">
            {/* Permit Overview Tile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Permit Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Permit Number</label>
                    <p className="text-base font-mono">{permit.permit_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Permit Type</label>
                    <p className="text-base">{permit.permit_type_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <PermitStatusBadge status={permit.application_status as PermitStatus} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Submitted Date</label>
                    <p className="text-base">{formatDate(permit.submitted_at)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Status Description</label>
                    <p className="text-base text-muted-foreground">{getStatusDescription(permit.application_status as PermitStatus)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Information Tile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Property Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Property Address</label>
                    <p className="text-base">{permit.property_address || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Scope of Work</label>
                    <SafeHtmlRenderer content={permit.scope_of_work} className="mt-1" fallback="No scope of work provided" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estimated Construction Value</label>
                    <p className="text-base">{formatCurrency(permit.estimated_construction_value_cents)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Applicant Information Tile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Applicant Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-base">{permit.applicant_full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-base">{permit.applicant_email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-base">{permit.applicant_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-base">{permit.applicant_address || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Review Timeline Tile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Review Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {permit.submitted_at && (
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                      <span className="font-medium">Submitted</span>
                      <span className="text-sm text-muted-foreground">{formatDate(permit.submitted_at)}</span>
                    </div>
                  )}
                  {permit.under_review_at && (
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                      <span className="font-medium">Under Review</span>
                      <span className="text-sm text-muted-foreground">{formatDate(permit.under_review_at)}</span>
                    </div>
                  )}
                  {permit.information_requested_at && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-orange-700">Information Requested</span>
                        <span className="text-sm text-orange-600">{formatDate(permit.information_requested_at)}</span>
                      </div>
                      {permit.review_notes && (
                        <p className="text-xs text-orange-600 italic">"{permit.review_notes}"</p>
                      )}
                    </div>
                  )}
                  {permit.approved_at && (
                    <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded">
                      <span className="font-medium text-green-700">Approved</span>
                      <span className="text-sm text-green-600">{formatDate(permit.approved_at)}</span>
                    </div>
                  )}
                  {permit.denied_at && (
                    <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded">
                      <span className="font-medium text-red-700">Denied</span>
                      <span className="text-sm text-red-600">{formatDate(permit.denied_at)}</span>
                    </div>
                  )}
                  {permit.issued_at && (
                    <div className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-200 rounded">
                      <span className="font-medium text-emerald-700">Issued</span>
                      <span className="text-sm text-emerald-600">{formatDate(permit.issued_at)}</span>
                    </div>
                  )}
                </div>
                
                {permit.review_notes && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <label className="text-sm font-medium text-blue-700">Review Notes</label>
                    <p className="text-sm text-blue-600 mt-1">{permit.review_notes}</p>
                  </div>
                )}
                
                {permit.denial_reason && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <label className="text-sm font-medium text-red-700">Denial Reason</label>
                    <p className="text-sm text-red-600 mt-1">{permit.denial_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notification History Tile */}
            <Card>
              <CardHeader>
                <CardTitle>Notification History</CardTitle>
              </CardHeader>
              <CardContent>
                {permitNotifications.length > 0 ? (
                  <div className="space-y-3">
                    {permitNotifications.map((notification) => (
                      <div key={notification.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(notification.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No notifications yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Permit Information Summary */}
          <div className="lg:col-span-4">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Permit Fees
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Permit Summary Section */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Permit Summary</h3>
                  <div className="space-y-2">
                    <p className="text-base font-medium">{permit.permit_number}</p>
                    <p className="text-sm text-muted-foreground">{permit.permit_type_name || 'Unknown'}</p>
                    <PermitStatusBadge status={permit.application_status as PermitStatus} />
                  </div>
                </div>

                {/* Fee Information */}
                {permit?.total_amount_cents > 0 && (
                  <>
                    <div className="border-t border-border"></div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Permit Fee</span>
                        <span className="text-base font-medium">{formatCurrency(permit.total_amount_cents)}</span>
                      </div>
                      {permit.payment_status === 'paid' && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
                          <span className="text-sm font-medium text-green-700">Payment Completed</span>
                        </div>
                      )}
                      {permit.payment_status === 'unpaid' && permit.application_status === 'approved' && (
                        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-700">Payment Required</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* No Fee Message */}
                {!permit?.total_amount_cents && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">No fee required for this permit.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermitOverview;