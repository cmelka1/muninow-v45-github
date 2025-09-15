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
  Edit
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
  
  const { data: application, isLoading, error } = useServiceApplication(applicationId!);
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
          <Button variant="outline" onClick={() => navigate('/municipal/other-services')}>
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
                         'postal_code', 'additional_information', 'notes', 'comments', 'amount_cents'];
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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/municipal/other-services')}
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
            {profile?.account_type === 'municipal' && (
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
          {/* Payment Management */}
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
                  <span className="text-sm font-medium text-muted-foreground">Payment Status</span>
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
                 
                 {/* Payment Confirmation Details for Paid Applications */}
                 {application.payment_status === 'paid' && (
                   <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                     <div className="flex items-center gap-2 text-green-700 mb-2">
                       <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                       <span className="text-sm font-medium">Payment Confirmed</span>
                     </div>
                     
                     <div className="space-y-1 text-sm">
                       {application.paid_at && (
                         <div className="flex justify-between">
                           <span className="text-muted-foreground">Payment Date:</span>
                           <span className="font-medium">{formatDate(application.paid_at)}</span>
                         </div>
                       )}
                       {application.payment_method_type && (
                         <div className="flex justify-between">
                           <span className="text-muted-foreground">Payment Method:</span>
                           <span className="font-medium">
                             {application.payment_method_type === 'BANK_ACCOUNT' ? 'Bank Transfer' : 'Credit/Debit Card'}
                           </span>
                         </div>
                       )}
                       {application.finix_transfer_id && (
                         <div className="flex justify-between">
                           <span className="text-muted-foreground">Transaction ID:</span>
                           <span className="font-mono text-xs bg-white px-2 py-1 rounded border">
                             {application.finix_transfer_id.slice(-8)}
                           </span>
                         </div>
                       )}
                     </div>
                   </div>
                 )}
                 
                 {/* Payment Amount Display */}
                 {application.payment_status === 'paid' ? (
                  // Detailed breakdown for paid applications
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Service Amount</span>
                      <span className="text-sm font-medium">
                        {formatCurrency((application.amount_cents || application.tile?.amount_cents || 0) / 100)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Service Fee</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(((application.total_amount_cents || 0) - (application.amount_cents || application.tile?.amount_cents || 0)) / 100)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium">Total Paid</span>
                      <span className="text-base font-bold">
                        {formatCurrency((application.total_amount_cents || 0) / 100)}
                      </span>
                    </div>
                  </div>
                ) : (
                  // Simple display for unpaid applications
                  (application.amount_cents || application.tile?.amount_cents) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Service Amount</span>
                      <span className="text-sm font-medium">
                        {formatCurrency((application.amount_cents || application.tile?.amount_cents || 0) / 100)}
                      </span>
                    </div>
                  )
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
        onStatusChange={() => window.location.reload()}
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