import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, MapPin, User, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { usePermit } from '@/hooks/usePermit';
import { PermitStatusBadge } from '@/components/PermitStatusBadge';
import { PermitCommunication } from '@/components/PermitCommunication';
import { getStatusDescription, PermitStatus } from '@/hooks/usePermitWorkflow';
import { formatCurrency, formatDate } from '@/lib/formatters';

const PermitDetail = () => {
  const { permitId } = useParams<{ permitId: string }>();
  const navigate = useNavigate();
  
  const { data: permit, isLoading, error } = usePermit(permitId!);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !permit) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/permits')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Permits
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading permit details. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/permits')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Permits
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Permit Application</h1>
            <p className="text-muted-foreground">{permit.permit_number}</p>
          </div>
        </div>
        <PermitStatusBadge status={permit.application_status as PermitStatus} />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Permit Details */}
        <div className="space-y-6">
          {/* Permit Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Permit Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Permit Number</Label>
                  <p className="text-base font-mono">{permit.permit_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <p className="text-base">{permit.permit_type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
                  <p className="text-base">{formatDate(permit.submitted_at)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Permit Fee</Label>
                  <p className="text-base">{formatCurrency(permit.total_amount_cents / 100)}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <p className="text-base text-muted-foreground mt-1">
                  {getStatusDescription(permit.application_status as PermitStatus)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Property Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Property Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Property Address</Label>
                <p className="text-base">{permit.property_address}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Project Description</Label>
                <p className="text-base">{permit.project_description}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Scope of Work</Label>
                <p className="text-base">{permit.scope_of_work}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Estimated Construction Value</Label>
                <p className="text-base">{formatCurrency(permit.estimated_construction_value_cents / 100)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Applicant Information */}
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
                  <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                  <p className="text-base">{permit.applicant_full_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-base">{permit.applicant_email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-base">{permit.applicant_phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  <p className="text-base">{permit.applicant_address || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Communication & Timeline */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Application Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {permit.submitted_at && (
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-sm font-medium">Submitted</span>
                  <span className="text-xs text-muted-foreground">{formatDate(permit.submitted_at)}</span>
                </div>
              )}
              {permit.under_review_at && (
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-sm font-medium">Under Review</span>
                  <span className="text-xs text-muted-foreground">{formatDate(permit.under_review_at)}</span>
                </div>
              )}
              {permit.information_requested_at && (
                <div className="flex justify-between items-center p-2 bg-orange-50 border border-orange-200 rounded">
                  <span className="text-sm font-medium text-orange-700">Additional Info Requested</span>
                  <span className="text-xs text-orange-600">{formatDate(permit.information_requested_at)}</span>
                </div>
              )}
              {permit.approved_at && (
                <div className="flex justify-between items-center p-2 bg-green-50 border border-green-200 rounded">
                  <span className="text-sm font-medium text-green-700">Approved</span>
                  <span className="text-xs text-green-600">{formatDate(permit.approved_at)}</span>
                </div>
              )}
              {permit.denied_at && (
                <div className="flex justify-between items-center p-2 bg-red-50 border border-red-200 rounded">
                  <span className="text-sm font-medium text-red-700">Denied</span>
                  <span className="text-xs text-red-600">{formatDate(permit.denied_at)}</span>
                </div>
              )}
              {permit.issued_at && (
                <div className="flex justify-between items-center p-2 bg-emerald-50 border border-emerald-200 rounded">
                  <span className="text-sm font-medium text-emerald-700">Permit Issued</span>
                  <span className="text-xs text-emerald-600">{formatDate(permit.issued_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PermitCommunication permitId={permitId!} isMunicipalUser={false} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PermitDetail;