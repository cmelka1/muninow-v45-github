import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, FileText, DollarSign, Calendar, MessageSquare } from 'lucide-react';
import { ServiceApplication, useUpdateServiceApplication } from '@/hooks/useServiceApplications';
import { MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';
import { format } from 'date-fns';

interface ApplicationDetailModalProps {
  application: ServiceApplication;
  serviceTile?: MunicipalServiceTile;
  onClose: () => void;
}

export function ApplicationDetailModal({ application, serviceTile, onClose }: ApplicationDetailModalProps) {
  const [newStatus, setNewStatus] = useState(application.status);
  const [reviewNotes, setReviewNotes] = useState(application.review_notes || '');
  const updateApplication = useUpdateServiceApplication();

  const statusOptions = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
  ];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
      case 'approved':
        return 'default';
      case 'denied':
        return 'destructive';
      case 'under_review':
        return 'secondary';
      case 'submitted':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleStatusUpdate = async () => {
    try {
      await updateApplication.mutateAsync({
        id: application.id,
        status: newStatus,
        review_notes: reviewNotes.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error updating application:', error);
    }
  };

  // Get applicant information from structured fields
  const applicantInfo = {
    'Name': application.applicant_name,
    'Email': application.applicant_email,
    'Phone': application.applicant_phone,
    'Business Name': application.business_legal_name,
    'Address': [
      application.street_address,
      application.apt_number && `Apt ${application.apt_number}`,
      application.city,
      application.state,
      application.zip_code,
    ].filter(Boolean).join(', '),
    'Additional Information': application.additional_information,
  };

  // Parse service-specific data to display
  const formFields = serviceTile?.form_fields || [];
  const serviceData = application.service_specific_data || {};

  return (
    <div className="space-y-6">
      {/* Application Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold">{serviceTile?.title || 'Unknown Service'}</h3>
          <p className="text-sm text-muted-foreground">
            Application #{application.application_number || application.id}
          </p>
        </div>
        <Badge variant={getStatusBadgeVariant(application.status)}>
          {application.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Information */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Service Fee:</span>
                <span className="font-medium">
                  {serviceTile ? formatCurrency(serviceTile.amount_cents) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Requires Review:</span>
                <span>{serviceTile?.requires_review ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Submitted:</span>
                <span>{format(new Date(application.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              {application.updated_at !== application.created_at && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated:</span>
                  <span>{format(new Date(application.updated_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}
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
            <CardContent className="space-y-2">
              {/* Structured applicant information */}
              {Object.entries(applicantInfo).map(([key, value]) => {
                if (!value) return null;
                
                return (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {key}:
                    </span>
                    <span className="text-sm font-medium">
                      {value}
                    </span>
                  </div>
                );
              })}
              
              {/* Service-specific data */}
              {Object.entries(serviceData).map(([key, value]) => {
                if (!value) return null;
                // Skip fields that are already shown in structured data
                const skipFields = ['name', 'full_name', 'first_name', 'last_name', 'email', 'phone', 'phone_number', 
                                   'business_name', 'business_legal_name', 'company_name', 'address', 'street_address', 
                                   'street', 'apt', 'apt_number', 'apartment', 'city', 'state', 'zip', 'zip_code', 
                                   'postal_code', 'additional_information', 'notes', 'comments'];
                if (skipFields.includes(key.toLowerCase())) return null;
                
                const field = formFields.find(f => f.id === key);
                const fieldLabel = field?.label || key;
                
                return (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm text-muted-foreground capitalize">
                      {fieldLabel}:
                    </span>
                    <span className="text-sm font-medium">
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Review Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Review & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Update Status</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as typeof newStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="notes">Review Notes</Label>
                <Textarea
                  id="notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                  rows={4}
                />
              </div>
              
              <Button
                onClick={handleStatusUpdate}
                disabled={updateApplication.isPending}
                className="w-full"
              >
                {updateApplication.isPending ? 'Updating...' : 'Update Application'}
              </Button>
            </CardContent>
          </Card>

          {/* Payment Information (if applicable) */}
          {application.payment_status === 'paid' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Transfer ID:</span>
                    <span className="font-mono text-sm">{application.finix_transfer_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount Paid:</span>
                    <span className="font-medium text-green-600">
                      {serviceTile ? formatCurrency(serviceTile.amount_cents) : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}