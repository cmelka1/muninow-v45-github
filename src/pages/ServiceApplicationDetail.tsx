import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, User, Clock, Receipt, Calendar, Building, Download, Loader2, MessageSquare, CreditCard, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { useServiceApplication } from '@/hooks/useServiceApplication';
import { useServiceApplicationDocuments } from '@/hooks/useServiceApplicationDocuments';
import { InlinePaymentFlow } from '@/components/payment/InlinePaymentFlow';
import { formatCurrency, formatDate, smartAbbreviateFilename } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ServiceApplicationStatusBadge from '@/components/ServiceApplicationStatusBadge';
import { ServiceApplicationRenewalStatusBadge } from '@/components/ServiceApplicationRenewalStatusBadge';
import { Badge } from '@/components/ui/badge';
import { AddServiceApplicationDocumentDialog } from '@/components/AddServiceApplicationDocumentDialog';
import { ServiceApplicationCommunication } from '@/components/ServiceApplicationCommunication';
import { AddPaymentMethodDialog } from '@/components/profile/AddPaymentMethodDialog';
import { RenewServiceApplicationDialog } from '@/components/RenewServiceApplicationDialog';
import { format } from 'date-fns';

const ServiceApplicationDetail: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [downloadingDocument, setDownloadingDocument] = useState<string | null>(null);
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  
  const { data: application, isLoading, error, refetch } = useServiceApplication(applicationId || '');
  const { data: documentsQuery, refetch: refetchDocuments } = useServiceApplicationDocuments(applicationId || '');
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  const handleAddPaymentMethodSuccess = () => {
    setIsAddPaymentDialogOpen(false);
  };

  // Helper function to check if within renewal window
  const isWithinRenewalWindow = (expiresAt: string, reminderDays: number = 30): boolean => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= reminderDays;
  };

  // Helper function to get renewal available date
  const getRenewalAvailableDate = (expiresAt: string, reminderDays: number = 30): Date => {
    const expiration = new Date(expiresAt);
    const renewalDate = new Date(expiration);
    renewalDate.setDate(renewalDate.getDate() - reminderDays);
    return renewalDate;
  };

  // Set documents from query
  React.useEffect(() => {
    if (documentsQuery) {
      setDocuments(documentsQuery);
      setDocumentsLoading(false);
      setDocumentsError(null);
    }
  }, [documentsQuery]);

  const handleDocumentDownload = async (document: any) => {
    setDownloadingDocument(document.id);
    try {
      const { data, error } = await supabase.storage
        .from('service-application-documents')
        .download(document.storage_path);
      
      if (error) {
        console.error('Error downloading document:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to download document. Please try again.",
        });
        return;
      }
      
      if (data) {
        const url = URL.createObjectURL(data);
        const a = globalThis.document.createElement('a');
        a.href = url;
        a.download = document.original_file_name || document.file_name;
        globalThis.document.body.appendChild(a);
        a.click();
        globalThis.document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Download started",
          description: `${document.original_file_name || document.file_name} is being downloaded.`,
        });
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download document. Please try again later.",
      });
    } finally {
      setDownloadingDocument(null);
    }
  };

  // Helper to format field names with underscores to proper labels
  const formatFieldLabel = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper to format applicant address, handling cases where street_address contains full address
  const formatApplicantAddress = (app: any): string | undefined => {
    const full = (app?.street_address || '').trim();
    const city = (app?.city || '').trim();
    const state = (app?.state || '').trim();
    const zip = (app?.zip_code || '').trim();

    // Heuristic: if street_address already looks like a full address (contains comma or state/zip pattern), use it as-is
    const looksFull = full.includes(',') || /[A-Z]{2}\s*,?\s*\d{5}/.test(full);
    if (full && looksFull) {
      return full;
    }

    // Otherwise assemble from components
    const parts = [
      full || undefined,
      app?.apt_number ? `Apt ${app.apt_number}` : undefined,
      city || undefined,
      state || undefined,
      zip || undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(', ');
    }

    // Fallback to service_specific_data address if present
    return app?.service_specific_data?.address || undefined;
  };

  const renderApplicationData = () => {
    const applicantData = [
      { label: 'Applicant Name', value: application?.applicant_name },
      { label: 'Email', value: application?.applicant_email },
      { label: 'Phone', value: application?.applicant_phone },
      { label: 'Business Name', value: application?.business_legal_name },
      { 
        label: 'Address', 
        value: formatApplicantAddress(application)
      },
      
    ];

    // Service-specific data
    const serviceData = application?.service_specific_data || {};
    const formFields = application?.tile?.form_fields || [];
    
    const serviceSpecificData = Object.entries(serviceData).map(([key, value]) => {
      // Skip fields that are already shown in structured data
      const skipFields = ['name', 'full_name', 'first_name', 'last_name', 'email', 'phone', 'phone_number', 
                         'business_name', 'business_legal_name', 'company_name', 'address', 'street_address', 
                         'street', 'apt', 'apt_number', 'apartment', 'city', 'state', 'zip', 'zip_code', 
                         'postal_code', 'additional_information', 'notes', 'comments', 'amount_cents', 'base_amount_cents'];
      if (skipFields.includes(key.toLowerCase()) || !value) return null;
      
      const field = formFields.find((f: any) => f.id === key);
      const fieldLabel = field?.label || formatFieldLabel(key);
      
      return { label: fieldLabel, value: String(value) };
    }).filter(Boolean);

    const allData = [...applicantData, ...serviceSpecificData];

    return allData.map((item, index) => {
      if (!item || !item.value) return null;

      return (
        <div key={index}>
          <Label className="text-sm font-medium text-muted-foreground">
            {item.label}
          </Label>
          <p className="text-base">
            {item.value}
          </p>
        </div>
      );
    });
  };

  const getBackRoute = () => {
    // Check if this is a sport reservation (has booking/time slot data)
    const isSportReservation = !!application?.booking_date;
    
    if (profile?.account_type === 'municipal') {
      return isSportReservation 
        ? '/municipal/sport-reservations' 
        : '/municipal/other-services';
    }
    
    return isSportReservation 
      ? '/sport-reservations' 
      : '/other-services';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-48 bg-gray-200 rounded"></div>
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
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate(getBackRoute())}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading service application details. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(getBackRoute())}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{application.tile?.title || 'Service Application'}</h1>
            <p className="text-muted-foreground">Application #{application.application_number || application.id}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Renewal Button - Show when within renewal window */}
            {application.status === 'issued' && 
             application.expires_at && 
             application.tile?.is_renewable && 
             isWithinRenewalWindow(
               application.expires_at, 
               application.tile?.renewal_reminder_days || 30
             ) && (
              <Button
                onClick={() => setIsRenewalDialogOpen(true)}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Renew Application
              </Button>
            )}

            {/* Show disabled button with tooltip when NOT in renewal window */}
            {application.status === 'issued' && 
             application.expires_at && 
             application.tile?.is_renewable && 
             !isWithinRenewalWindow(
               application.expires_at, 
               application.tile?.renewal_reminder_days || 30
             ) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" disabled className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Renew Application
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Renewal available starting {format(getRenewalAvailableDate(application.expires_at, application.tile?.renewal_reminder_days || 30), 'MMMM d, yyyy')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <ServiceApplicationStatusBadge status={application.status} />
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Application Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Application Number</Label>
                  <p className="text-base font-mono">{application.application_number || application.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Service</Label>
                  <p className="text-base">{application.tile?.title || 'Service information unavailable'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <ServiceApplicationStatusBadge status={application.status} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Municipality</Label>
                  <p className="text-base">{application.customer?.legal_entity_name || 'Municipality information unavailable'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
                  <p className="text-base">{formatDate(application.created_at)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                  <p className="text-base">{formatDate(application.updated_at)}</p>
                </div>
                {application.expires_at && application.status === 'issued' && application.tile?.is_renewable && (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Expiration Date</Label>
                      <p className="text-base">{formatDate(application.expires_at)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Renewal Status</Label>
                      <div className="mt-1">
                        <ServiceApplicationRenewalStatusBadge 
                          renewalStatus={application.renewal_status || 'active'} 
                          expiresAt={application.expires_at}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reservation Summary - Only for booking applications */}
          {application.booking_date && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Reservation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Reservation Date</Label>
                    <p className="text-base font-medium">{formatDate(application.booking_date)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Time Slot</Label>
                    <p className="text-base font-medium">
                      {application.booking_start_time ? (
                        <>
                          {format(new Date(`2000-01-01T${application.booking_start_time}`), 'h:mm a')}
                          {application.booking_end_time && (
                            <>
                              {' - '}
                              {format(new Date(`2000-01-01T${application.booking_end_time}`), 'h:mm a')}
                              <span className="text-sm text-muted-foreground ml-2">
                                ({(() => {
                                  const start = new Date(`2000-01-01T${application.booking_start_time}`);
                                  const end = new Date(`2000-01-01T${application.booking_end_time}`);
                                  const diffMs = end.getTime() - start.getTime();
                                  const diffMins = Math.floor(diffMs / 60000);
                                  const hours = Math.floor(diffMins / 60);
                                  const mins = diffMins % 60;
                                  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                                })()})
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        'Time not specified'
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Timezone</Label>
                    <p className="text-base">{application.booking_timezone || 'America/New_York'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Reservation Status</Label>
                    <div className="mt-1">
                      <ServiceApplicationStatusBadge status={application.status} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Confirmation Number</Label>
                    <p className="text-base font-mono">{application.application_number || application.id}</p>
                  </div>
                </div>

                {/* Cancellation Details */}
                {application.cancelled_at && (
                  <>
                    <Separator />
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                      <Label className="text-sm font-medium text-amber-800">Cancellation Details</Label>
                      <div className="space-y-1">
                        <p className="text-sm text-amber-700">
                          <span className="font-medium">Cancelled on:</span> {formatDate(application.cancelled_at)}
                        </p>
                        {application.cancellation_reason && (
                          <p className="text-sm text-amber-700">
                            <span className="font-medium">Reason:</span> {application.cancellation_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Applicant Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Application Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderApplicationData()}
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          {application.additional_information && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SafeHtmlRenderer 
                  content={application.additional_information}
                  fallback="No additional information provided"
                />
              </CardContent>
            </Card>
          )}

          {/* Review Notes */}
          {application.review_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Review Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SafeHtmlRenderer 
                  content={application.review_notes}
                  fallback="No review notes provided"
                />
              </CardContent>
            </Card>
          )}

          {/* Documents Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Supporting Documents ({documents?.length || 0})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddDocumentOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documentsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : documentsError ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm text-red-600">Error loading documents</p>
                  <p className="text-xs mt-1">{documentsError}</p>
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm font-medium truncate">
                                    {smartAbbreviateFilename(doc.original_file_name || doc.file_name, 30)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{doc.original_file_name || doc.file_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                            <span>Uploaded: {formatDate(doc.created_at)}</span>
                            {doc.document_type && <span>Type: {doc.document_type}</span>}
                          </div>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDocumentDownload(doc)}
                          disabled={downloadingDocument === doc.id}
                        >
                          {downloadingDocument === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No documents uploaded yet</p>
                  <p className="text-xs mt-1">Documents will appear here once uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Payment Management - Using Unified Payment Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-muted-foreground">Payment Status</Label>
                  <Badge 
                    variant={application.payment_status === 'paid' ? 'default' : 'outline'}
                    className={
                      application.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' 
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200'
                    }
                  >
                    {application.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>
              </div>
              
              {/* Inline Payment Flow - Same as Permits */}
              {application.status === 'approved' && application.payment_status !== 'paid' && (
                <InlinePaymentFlow
                  entityType="service_application"
                  entityId={application.id}
                  customerId={application.customer_id}
                  merchantId={application.merchant_id || ''}
                  baseAmountCents={application.base_amount_cents || application.tile?.amount_cents || 0}
                  entityName={application.tile?.title || 'Service Application'}
                  initialExpanded={true}
                  onPaymentSuccess={() => {
                    toast({
                      title: "Payment Successful",
                      description: "Your service application payment has been processed successfully.",
                    });
                    refetch();
                  }}
                  onPaymentError={(error) => {
                    console.error('Payment error:', error);
                  }}
                  onAddPaymentMethod={() => setIsAddPaymentDialogOpen(true)}
                />
              )}
              
              {application.payment_status === 'paid' && (
                <div className="pt-2 space-y-2">
                  <Button className="w-full" disabled variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payment Complete
                  </Button>
                  <p className="text-xs text-green-600 mt-2">
                    Your service application fee has been paid
                  </p>
                </div>
              )}
              
              {application.status !== 'approved' && application.payment_status !== 'paid' && (
                <div className="pt-2">
                  <Button className="w-full" disabled variant="outline">
                    Payment Unavailable
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Payment processing will be available once your application is approved
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Created - always shown */}
              <div className="flex justify-between items-center py-1">
                <span className="text-sm font-medium">Created</span>
                <span className="text-xs text-muted-foreground">{formatDate(application.created_at)}</span>
              </div>
              
              {/* Submitted - show if submitted_at exists */}
              {application.submitted_at && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium">Submitted</span>
                  <span className="text-xs text-muted-foreground">{formatDate(application.submitted_at)}</span>
                </div>
              )}
              
              {/* Under Review - show if under_review_at exists */}
              {application.under_review_at && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium">Under Review</span>
                  <span className="text-xs text-muted-foreground">{formatDate(application.under_review_at)}</span>
                </div>
              )}
              
              {/* Information Requested - show if information_requested_at exists */}
              {application.information_requested_at && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium">Information Requested</span>
                  <span className="text-xs text-muted-foreground">{formatDate(application.information_requested_at)}</span>
                </div>
              )}
              
              {/* Resubmitted - show if resubmitted_at exists */}
              {application.resubmitted_at && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium">Resubmitted</span>
                  <span className="text-xs text-muted-foreground">{formatDate(application.resubmitted_at)}</span>
                </div>
              )}
              
              {/* Approved - show if approved_at exists (even if status has progressed to issued) */}
              {application.approved_at && (
                <div className="flex justify-between items-center py-1 text-green-700">
                  <span className="text-sm font-medium">Approved</span>
                  <span className="text-xs">{formatDate(application.approved_at)}</span>
                </div>
              )}
              
              {/* Denied - show if denied_at exists */}
              {application.denied_at && (
                <div className="flex justify-between items-center py-1 text-red-700">
                  <span className="text-sm font-medium">Denied</span>
                  <span className="text-xs">{formatDate(application.denied_at)}</span>
                </div>
              )}
              
              {/* Withdrawn - show if withdrawn_at exists */}
              {application.withdrawn_at && (
                <div className="flex justify-between items-center py-1 text-amber-700">
                  <span className="text-sm font-medium">Withdrawn</span>
                  <span className="text-xs">{formatDate(application.withdrawn_at)}</span>
                </div>
              )}
              
              {/* Expired - show if expired_at exists */}
              {application.expired_at && (
                <div className="flex justify-between items-center py-1 text-gray-700">
                  <span className="text-sm font-medium">Expired</span>
                  <span className="text-xs">{formatDate(application.expired_at)}</span>
                </div>
              )}
              
              {/* Issued - show if issued_at exists */}
              {application.issued_at && (
                <div className="flex justify-between items-center py-1 text-emerald-700">
                  <span className="text-sm font-medium">Issued</span>
                  <span className="text-xs">{formatDate(application.issued_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication */}
          <ServiceApplicationCommunication applicationId={applicationId || ''} />
        </div>
      </div>

      <AddServiceApplicationDocumentDialog
        applicationId={applicationId!}
        customerId={application?.customer_id || ''}
        open={addDocumentOpen}
        onOpenChange={setAddDocumentOpen}
        onSuccess={() => {
          refetchDocuments();
          setAddDocumentOpen(false);
        }}
      />

      {/* Add Payment Method Dialog */}
      <AddPaymentMethodDialog
        open={isAddPaymentDialogOpen}
        onOpenChange={setIsAddPaymentDialogOpen}
        onSuccess={handleAddPaymentMethodSuccess}
      />

      {/* Renewal Dialog */}
      <RenewServiceApplicationDialog
        open={isRenewalDialogOpen}
        onOpenChange={setIsRenewalDialogOpen}
        application={{
          id: application.id,
          application_number: application.application_number,
          service_name: application.tile?.title || 'Service Application',
          applicant_name: application.applicant_name,
          business_legal_name: application.business_legal_name,
          expires_at: application.expires_at,
          base_amount_cents: application.base_amount_cents || 0,
          renewal_reminder_days: application.tile?.renewal_reminder_days,
        }}
      />
    </div>
  );
};

export default ServiceApplicationDetail;