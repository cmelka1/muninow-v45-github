import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, User, Clock, Receipt, Calendar, Building, Download, Loader2, MessageSquare, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { useServiceApplication } from '@/hooks/useServiceApplication';
import { useServiceApplicationDocuments } from '@/hooks/useServiceApplicationDocuments';
import { formatCurrency, formatDate, smartAbbreviateFilename } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ServiceApplicationStatusBadge from '@/components/ServiceApplicationStatusBadge';
import { Badge } from '@/components/ui/badge';

const ServiceApplicationDetail: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [downloadingDocument, setDownloadingDocument] = useState<string | null>(null);
  
  const { data: application, isLoading, error } = useServiceApplication(applicationId || '');
  const { data: documentsQuery } = useServiceApplicationDocuments(applicationId || '');
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

  const getBackRoute = () => {
    if (profile?.account_type === 'municipal') {
      return '/municipal/other-services';
    }
    return '/other-services';
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
            <h1 className="text-2xl font-bold">Service Application</h1>
            <p className="text-muted-foreground">Application #{application.id}</p>
          </div>
          <ServiceApplicationStatusBadge status={application.status} />
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
                  <p className="text-base font-mono">{application.id}</p>
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
                        : application.payment_status === 'processing'
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200'
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200'
                    }
                  >
                    {application.payment_status === 'paid' ? 'Paid' : 
                     application.payment_status === 'processing' ? 'Processing' : 'Pending'}
                  </Badge>
                </div>
              </div>
              
              {application.status === 'approved' && application.payment_status !== 'paid' ? (
                <div className="space-y-4">
                  {/* Payment Summary */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Base Amount</span>
                      <span className="text-sm">{formatCurrency((application.amount_cents || 0) / 100)}</span>
                    </div>
                    {application.service_fee_cents && application.service_fee_cents > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Service Fee</span>
                        <span className="text-sm">{formatCurrency(application.service_fee_cents / 100)}</span>
                      </div>
                    )}
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Amount</span>
                        <span className="font-medium">{formatCurrency((application.total_amount_cents || application.amount_cents || 0) / 100)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Complete payment to process your application
                  </p>
                </div>
              ) : application.payment_status === 'paid' ? (
                <div className="pt-2 space-y-2">
                  <Button className="w-full" disabled variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payment Complete
                  </Button>
                  
                  <p className="text-xs text-green-600 mt-2">
                    Your application fee has been paid
                  </p>
                </div>
              ) : (
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
              <div className="flex justify-between items-center py-1">
                <span className="text-sm font-medium">Created</span>
                <span className="text-xs text-muted-foreground">{formatDate(application.created_at)}</span>
              </div>
              {application.status === 'submitted' || application.status === 'under_review' || application.status === 'approved' || application.status === 'denied' ? (
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium">Submitted</span>
                  <span className="text-xs text-muted-foreground">{formatDate(application.created_at)}</span>
                </div>
              ) : null}
              {(application.status === 'under_review' || application.status === 'approved' || application.status === 'denied') && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium">Under Review</span>
                  <span className="text-xs text-muted-foreground">{formatDate(application.updated_at)}</span>
                </div>
              )}
              {application.status === 'approved' && (
                <div className="flex justify-between items-center py-1 text-green-700">
                  <span className="text-sm font-medium">Approved</span>
                  <span className="text-xs">{formatDate(application.updated_at)}</span>
                </div>
              )}
              {application.status === 'denied' && (
                <div className="flex justify-between items-center py-1 text-red-700">
                  <span className="text-sm font-medium">Denied</span>
                  <span className="text-xs">{formatDate(application.updated_at)}</span>
                </div>
              )}
              {application.payment_status === 'paid' && (
                <div className="flex justify-between items-center py-1 text-emerald-700">
                  <span className="text-sm font-medium">Payment Complete</span>
                  <span className="text-xs">{formatDate(application.updated_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ServiceApplicationDetail;