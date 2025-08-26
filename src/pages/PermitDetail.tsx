import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, MapPin, User, Clock, MessageSquare, Download, Eye, CreditCard, Building, Plus, Loader2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MunicipalLayout } from '@/components/layouts/MunicipalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePermit } from '@/hooks/usePermit';
import { usePermitDocuments } from '@/hooks/usePermitDocuments';
import { useMunicipalPermitQuestions } from '@/hooks/useMunicipalPermitQuestions';
import { usePermitPaymentMethods } from '@/hooks/usePermitPaymentMethods';
import { AddPermitDocumentDialog } from '@/components/AddPermitDocumentDialog';
import { AddPaymentMethodDialog } from '@/components/profile/AddPaymentMethodDialog';
import { PermitStatusBadge } from '@/components/PermitStatusBadge';
import { PermitCommunication } from '@/components/PermitCommunication';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import PermitPaymentSummary from '@/components/PermitPaymentSummary';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import PaymentButtonsContainer from '@/components/PaymentButtonsContainer';
import { getStatusDescription, PermitStatus } from '@/hooks/usePermitWorkflow';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const PermitDetail = () => {
  const { permitId } = useParams<{ permitId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [downloadingDocument, setDownloadingDocument] = useState<string | null>(null);
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  
  const isMunicipalUser = user?.user_metadata?.account_type === 'municipal';
  
  const { data: permit, isLoading, error, refetch: refetchPermit } = usePermit(permitId!);
  const { data: documents = [], isLoading: documentsLoading, refetch: refetchDocuments } = usePermitDocuments(permitId!);
  const { data: questions } = useMunicipalPermitQuestions(
    permit?.customer_id,
    permit?.merchant_id
  );

  // Payment methods hook
  const {
    selectedPaymentMethod,
    serviceFee,
    paymentInstruments,
    isProcessingPayment,
    totalWithFee,
    handlePayment,
    handleGooglePayment,
    handleApplePayment,
    setSelectedPaymentMethod,
    loadPaymentInstruments,
    paymentMethodsLoading
  } = usePermitPaymentMethods(permit);

  const handleAddPaymentMethodSuccess = async (paymentMethodId?: string) => {
    await loadPaymentInstruments();
    if (paymentMethodId) {
      setSelectedPaymentMethod(paymentMethodId);
    }
  };

  const handleDocumentView = (document: any) => {
    setSelectedDocument(document);
    setDocumentViewerOpen(true);
  };

  const handleDocumentDownload = async (document: any) => {
    setDownloadingDocument(document.id);
    try {
      console.log('Attempting to download document:', document.storage_path);
      
      const { data, error } = await supabase.storage
        .from('permit-documents')
        .download(document.storage_path);
      
      if (error) {
        console.error('Error downloading document:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to download document. Please try again or contact support.",
        });
        return;
      }
      
      if (data) {
        const url = URL.createObjectURL(data);
        const a = globalThis.document.createElement('a');
        a.href = url;
        a.download = document.file_name;
        globalThis.document.body.appendChild(a);
        a.click();
        globalThis.document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Download started",
          description: `${document.file_name} is being downloaded.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No data received for download.",
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

  if (error || !permit) {
    return (
      <div className="min-h-screen bg-gray-100">
        {isMunicipalUser ? (
          <MunicipalLayout>
            <div className="p-6">
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-destructive">Error loading permit details. Please try again.</p>
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
                    <CardContent className="py-12 text-center">
                      <p className="text-destructive">Error loading permit details. Please try again.</p>
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
            onClick={() => navigate('/permits')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Permit Application</h1>
            <p className="text-gray-600">{permit.permit_number}</p>
          </div>
          <PermitStatusBadge status={permit.application_status as PermitStatus} />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Permit Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Permit Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Permit Number</Label>
                  <p className="text-base font-mono">{permit.permit_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <p className="text-base">{permit.permit_type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <PermitStatusBadge status={permit.application_status as PermitStatus} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
                  <p className="text-base">{formatDate(permit.submitted_at)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Construction Value</Label>
                  <p className="text-base">{formatCurrency(permit.estimated_construction_value_cents / 100)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Permit Fee</Label>
                  <p className="text-base">{formatCurrency((permit.base_fee_cents || permit.total_amount_cents || 0) / 100)}</p>
                </div>
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
                <Label className="text-sm font-medium text-muted-foreground">Scope of Work</Label>
                <SafeHtmlRenderer content={permit.scope_of_work} className="mt-1" fallback="No scope of work provided" />
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

          {/* Municipal Questions */}
          {questions && questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Municipal Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {questions.map((question) => {
                  const response = permit.municipal_questions_responses?.[question.id];
                  const hasResponse = response !== undefined && response !== null;
                  const isYes = hasResponse && (response === true || response === 'yes');
                  
                  return (
                    <div key={question.id} className="flex items-center justify-between py-2">
                      <span className="text-sm">{question.question_text}</span>
                      <Badge variant={isYes ? "default" : "outline"}>
                        {isYes ? "Yes" : "No"}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Documents Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents ({documents?.length || 0})
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
              ) : documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{doc.file_name}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                            <span>Uploaded: {formatDate(doc.uploaded_at)}</span>
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
                          onClick={() => handleDocumentView(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
                  <Label className="text-sm font-medium text-muted-foreground">Payment Status</Label>
                  <Badge 
                    variant={permit.payment_status === 'paid' ? 'default' : 'outline'}
                    className={
                      permit.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' 
                        : permit.payment_status === 'processing'
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200'
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200'
                    }
                  >
                    {permit.payment_status === 'paid' ? 'Paid' : 
                     permit.payment_status === 'processing' ? 'Processing' : 'Pending'}
                  </Badge>
                </div>
              </div>
              
              {permit.application_status === 'approved' && permit.payment_status !== 'paid' ? (
                <div className="space-y-4">
                  {/* Payment Summary */}
                  <PermitPaymentSummary 
                    baseAmount={(permit.base_fee_cents || permit.total_amount_cents || 0)}
                    serviceFee={serviceFee}
                    selectedPaymentMethod={selectedPaymentMethod}
                    compact={true}
                  />
                  
                  {/* Payment Method Selection */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Payment Method</Label>
                    <div className="space-y-3">
                      <PaymentMethodSelector
                        paymentInstruments={paymentInstruments}
                        selectedPaymentMethod={selectedPaymentMethod}
                        onSelectPaymentMethod={setSelectedPaymentMethod}
                        isLoading={paymentMethodsLoading}
                        maxMethods={5}
                      />
                      
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => setIsAddPaymentDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Payment Method
                      </Button>
                    </div>
                  </div>
                  
                  {/* Payment Buttons */}
                  <div className="space-y-2">
                    {selectedPaymentMethod && (
                      <Button 
                        className="w-full" 
                        onClick={handlePayment}
                        disabled={isProcessingPayment}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {isProcessingPayment ? 'Processing...' : `Pay ${formatCurrency((totalWithFee || 0) / 100)}`}
                      </Button>
                    )}
                    
                    <PaymentButtonsContainer
                      bill={permit}
                      totalAmount={totalWithFee || 0}
                      merchantId={permit?.finix_merchant_id}
                      onGooglePayment={() => handleGooglePayment().then(() => {})}
                      onApplePayment={() => handleApplePayment().then(() => {})}
                      isDisabled={isProcessingPayment}
                    />
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Complete payment to receive your permit
                  </p>
                </div>
              ) : permit.payment_status === 'paid' ? (
                <div className="pt-2">
                  <Button className="w-full" disabled variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payment Complete
                  </Button>
                  <p className="text-xs text-green-600 mt-2">
                    Your permit fee has been paid
                  </p>
                </div>
              ) : (
                <div className="pt-2">
                  <Button className="w-full" disabled variant="outline">
                    Payment Unavailable
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Payment processing will be available once your permit is approved
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compact Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {permit.submitted_at && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium">Submitted</span>
                  <span className="text-xs text-muted-foreground">{formatDate(permit.submitted_at)}</span>
                </div>
              )}
              {permit.under_review_at && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium">Under Review</span>
                  <span className="text-xs text-muted-foreground">{formatDate(permit.under_review_at)}</span>
                </div>
              )}
              {permit.information_requested_at && (
                <div className="p-2 bg-orange-50 border border-orange-200 rounded space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-orange-700">Info Requested</span>
                    <span className="text-xs text-orange-600">{formatDate(permit.information_requested_at)}</span>
                  </div>
                </div>
              )}
              {permit.approved_at && (
                <div className="flex justify-between items-center py-1 text-green-700">
                  <span className="text-sm font-medium">Approved</span>
                  <span className="text-xs">{formatDate(permit.approved_at)}</span>
                </div>
              )}
              {permit.denied_at && (
                <div className="flex justify-between items-center py-1 text-red-700">
                  <span className="text-sm font-medium">Denied</span>
                  <span className="text-xs">{formatDate(permit.denied_at)}</span>
                </div>
              )}
              {permit.issued_at && (
                <div className="flex justify-between items-center py-1 text-emerald-700">
                  <span className="text-sm font-medium">Permit Issued</span>
                  <span className="text-xs">{formatDate(permit.issued_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication */}
          <PermitCommunication permitId={permitId!} isMunicipalUser={false} />
        </div>
      </div>

      {/* Add Document Dialog */}
      <AddPermitDocumentDialog
        open={addDocumentOpen}
        onOpenChange={setAddDocumentOpen}
        permitId={permitId!}
        customerId={permit.customer_id}
        merchantId={permit.merchant_id}
        merchantName={permit.merchant_name}
        onSuccess={() => refetchDocuments()}
      />
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
      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={documentViewerOpen}
        onClose={() => setDocumentViewerOpen(false)}
        document={selectedDocument}
      />
      
      <AddPaymentMethodDialog
        open={isAddPaymentDialogOpen}
        onOpenChange={setIsAddPaymentDialogOpen}
        onSuccess={handleAddPaymentMethodSuccess}
      />
    </div>
  );
};

export default PermitDetail;