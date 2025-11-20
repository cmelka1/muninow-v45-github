import React, { useState } from 'react';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  Clock, 
  Receipt,
  Calendar,
  MessageSquare, 
  Users,
  Building,
  Download,
  Eye,
  DollarSign,
  Plus,
  CreditCard,
  Loader2,
  Edit,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { useServiceApplication } from '@/hooks/useServiceApplication';
import ServiceApplicationStatusBadge from '@/components/ServiceApplicationStatusBadge';
import { ServiceApplicationStatusChangeDialog } from '@/components/ServiceApplicationStatusChangeDialog';
import { ServiceApplicationCommunication } from '@/components/ServiceApplicationCommunication';
import { ServiceApplicationReviewManagement } from '@/components/ServiceApplicationReviewManagement';
import { ServiceApplicationStatus, getStatusDisplayName } from '@/hooks/useServiceApplicationWorkflow';
import { useServiceApplicationDocuments } from '@/hooks/useServiceApplicationDocuments';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate, smartAbbreviateFilename } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const MunicipalServiceApplicationDetail = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [reviewNotes, setReviewNotes] = useState('');
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [downloadingDocument, setDownloadingDocument] = useState<string | null>(null);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  
  const { data: application, isLoading, error, refetch } = useServiceApplication(applicationId!);
  const { data: documentsQuery } = useServiceApplicationDocuments(applicationId!);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  // Set documents from query
  React.useEffect(() => {
    if (documentsQuery) {
      setDocuments(documentsQuery);
      setDocumentsLoading(false);
      setDocumentsError(null);
    }
  }, [documentsQuery]);

  const handleSaveNotes = async () => {
    if (!applicationId || !reviewNotes.trim()) {
      toast({
        title: "Error",
        description: "Please enter review notes before saving",
        variant: "destructive"
      });
      return;
    }

    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from('municipal_service_applications')
        .update({ review_notes: reviewNotes.trim() })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review notes saved successfully"
      });

      setReviewNotes('');
      window.location.reload();
    } catch (error) {
      console.error('Error saving review notes:', error);
      toast({
        title: "Error",
        description: "Failed to save review notes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleStatusChange = () => {
    setIsStatusDialogOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!applicationId || !profile?.id) return;

    setIsCancellingBooking(true);
    try {
      const { error } = await supabase
        .from('municipal_service_applications')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: profile.id,
          cancellation_reason: 'Cancelled by municipal staff'
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Booking Cancelled",
        description: "The booking has been successfully cancelled."
      });

      refetch();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCancellingBooking(false);
    }
  };

  const renderFormField = (field: any, value: any) => {
    if (!value) return 'N/A';
    
    switch (field.type) {
      case 'select':
        const option = field.options?.find((opt: any) => opt.value === value);
        return option?.label || value;
      case 'checkbox':
        return value ? 'Yes' : 'No';
      case 'date':
        return format(new Date(value), 'MMM d, yyyy');
      default:
        return value;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate(getBackRoute())}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading application details. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const renderApplicationData = () => {
    const applicantData = [
      { label: 'Applicant Name', value: application?.applicant_name },
      { label: 'Email', value: application?.applicant_email },
      { label: 'Phone', value: application?.applicant_phone },
      { label: 'Business Name', value: application?.business_legal_name },
      { 
        label: 'Address', 
        value: [
          application?.street_address,
          application?.apt_number && `Apt ${application.apt_number}`,
          application?.city,
          application?.state,
          application?.zip_code,
        ].filter(Boolean).join(', ') || undefined 
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
      const fieldLabel = field?.label || key;
      
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
    
    return isSportReservation 
      ? '/municipal/sport-reservations' 
      : '/municipal/other-services';
  };

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
            <ServiceApplicationStatusBadge status={application.status} />
            {profile?.account_type?.startsWith('municipal') && 
             !(application.status === 'issued' && application.payment_status === 'paid') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStatusDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Change Status
              </Button>
            )}
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
                  <Label className="text-sm font-medium text-muted-foreground">Application ID</Label>
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
              </div>
            </CardContent>
          </Card>

          {/* Booking Details */}
          {application.booking_date && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Booking Details
                  </CardTitle>
                  {application.status === 'reserved' && profile?.account_type?.startsWith('municipal') && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCancelBooking}
                      disabled={isCancellingBooking}
                      className="flex items-center gap-2"
                    >
                      {isCancellingBooking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          Cancel Booking
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Booking Date</Label>
                    <p className="text-base font-semibold">
                      {format(new Date(application.booking_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Time Slot</Label>
                  <p className="text-base font-semibold">
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
                  {application.booking_timezone && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Timezone</Label>
                      <p className="text-base">{application.booking_timezone}</p>
                    </div>
                  )}
                  {application.cancelled_at && (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Cancelled At</Label>
                        <p className="text-base text-destructive">
                          {formatDate(application.cancelled_at)}
                        </p>
                      </div>
                      {application.cancellation_reason && (
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-muted-foreground">Cancellation Reason</Label>
                          <p className="text-base">{application.cancellation_reason}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
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
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Supporting Documents ({documents?.length || 0})
              </CardTitle>
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
                  <p className="text-sm">No supporting documents</p>
                  <p className="text-xs mt-1">Documents would appear here if uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Payment Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Payment Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* Status Badge */}
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
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
                
                {/* Paid On - Only show if paid */}
                {application.payment_processed_at && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Paid On</span>
                    <span className="font-semibold">
                      {format(new Date(application.payment_processed_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                
                <Separator />
                
                {/* Base Amount - Always show */}
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Base Amount</span>
                  <span className="font-semibold">{formatCurrency(application.base_amount_cents || 0)}</span>
                </div>
                
                {/* Service Fee and Total - Only show for paid transactions */}
                {application.payment_status === 'paid' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Service Fee</span>
                      <span className="font-semibold">{formatCurrency(application.service_fee_cents || 0)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Paid</span>
                      <span>{formatCurrency(application.total_amount_cents || 0)}</span>
                    </div>
                  </>
                )}
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
                {application.created_at && (
                  <div className="flex justify-between text-sm">
                    <span>Created</span>
                    <span className="text-gray-600">{formatDate(application.created_at)}</span>
                  </div>
                )}
                {application.submitted_at && (
                  <div className="flex justify-between text-sm">
                    <span>Submitted</span>
                    <span className="text-gray-600">{formatDate(application.submitted_at)}</span>
                  </div>
                )}
                {application.under_review_at && (
                  <div className="flex justify-between text-sm">
                    <span>Under Review</span>
                    <span className="text-gray-600">{formatDate(application.under_review_at)}</span>
                  </div>
                )}
                {application.information_requested_at && (
                  <div className="flex justify-between text-sm">
                    <span>Information Requested</span>
                    <span className="text-gray-600">{formatDate(application.information_requested_at)}</span>
                  </div>
                )}
                {application.resubmitted_at && (
                  <div className="flex justify-between text-sm">
                    <span>Resubmitted</span>
                    <span className="text-gray-600">{formatDate(application.resubmitted_at)}</span>
                  </div>
                )}
                {application.approved_at && (
                  <div className="flex justify-between text-sm">
                    <span>Approved</span>
                    <span className="text-gray-600">{formatDate(application.approved_at)}</span>
                  </div>
                )}
                {application.denied_at && (
                  <div className="flex justify-between text-sm">
                    <span>Denied</span>
                    <span className="text-gray-600">{formatDate(application.denied_at)}</span>
                  </div>
                )}
                {application.withdrawn_at && (
                  <div className="flex justify-between text-sm">
                    <span>Withdrawn</span>
                    <span className="text-gray-600">{formatDate(application.withdrawn_at)}</span>
                  </div>
                )}
                {application.expired_at && (
                  <div className="flex justify-between text-sm">
                    <span>Expired</span>
                    <span className="text-gray-600">{formatDate(application.expired_at)}</span>
                  </div>
                )}
                {application.issued_at && (
                  <div className="flex justify-between text-sm">
                    <span>Issued</span>
                    <span className="text-gray-600">{formatDate(application.issued_at)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Review Management and Communication */}
          {profile?.account_type === 'municipal' ? (
            <>
              <ServiceApplicationReviewManagement 
                application={application} 
                onStatusChange={() => window.location.reload()} 
              />
              <ServiceApplicationCommunication applicationId={applicationId!} />
            </>
          ) : (
            <ServiceApplicationCommunication applicationId={applicationId!} />
          )}
        </div>
      </div>

      {/* Status Change Dialog */}
      <ServiceApplicationStatusChangeDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        applicationId={applicationId!}
        currentStatus={application.status as ServiceApplicationStatus}
        onStatusChange={() => {
          refetch();
          setIsStatusDialogOpen(false);
        }}
      />

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewerModal
          isOpen={documentViewerOpen}
          onClose={() => {
            setDocumentViewerOpen(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
          bucketName="service-application-documents"
        />
      )}
    </div>
  );
};

export default MunicipalServiceApplicationDetail;