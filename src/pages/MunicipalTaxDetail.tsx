import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  CreditCard,
  Clock, 
  Building,
  Download,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTaxSubmissionDetail } from '@/hooks/useTaxSubmissionDetail';
import { useTaxSubmissionDocuments } from '@/hooks/useTaxSubmissionDocuments';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const MunicipalTaxDetail = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  
  const { data: submission, isLoading, error } = useTaxSubmissionDetail(submissionId || null);
  const { getDocuments } = useTaxSubmissionDocuments();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  // Load documents when submission is available
  React.useEffect(() => {
    if (submission?.id) {
      setLoadingDocuments(true);
      setDocumentsError(null);
      
      getDocuments(submission.id)
        .then(setDocuments)
        .catch((error) => {
          console.error('Error loading documents:', error);
          setDocumentsError(error.message || 'Failed to load documents');
        })
        .finally(() => setLoadingDocuments(false));
    }
  }, [submission?.id]); // Removed getDocuments from dependencies to prevent infinite re-renders

  const retryLoadDocuments = React.useCallback(() => {
    if (submission?.id) {
      setLoadingDocuments(true);
      setDocumentsError(null);
      
      getDocuments(submission.id)
        .then(setDocuments)
        .catch((error) => {
          console.error('Error loading documents:', error);
          setDocumentsError(error.message || 'Failed to load documents');
        })
        .finally(() => setLoadingDocuments(false));
    }
  }, [submission?.id, getDocuments]);

  const formatTaxType = (taxType: string) => {
    const typeMap: Record<string, string> = {
      'food_beverage': 'Food & Beverage Tax',
      'hotel_motel': 'Hotel & Motel Tax',
      'amusement': 'Amusement Tax'
    };
    return typeMap[taxType] || taxType;
  };

  const formatPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });
    const end = new Date(endDate).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    return `${start} - ${end}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: 'Paid', variant: 'default' as const },
      pending: { label: 'Pending', variant: 'secondary' as const },
      failed: { label: 'Failed', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      variant: 'secondary' as const 
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodDisplay = (submission: any) => {
    if (submission.payment_type === 'PAYMENT_CARD' && submission.card_brand && submission.card_last_four) {
      return `${submission.card_brand} •••• ${submission.card_last_four}`;
    }
    if (submission.payment_type === 'BANK_ACCOUNT' && submission.bank_last_four) {
      return `Bank Account •••• ${submission.bank_last_four}`;
    }
    return submission.payment_type || 'N/A';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-64" />
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

  if (error || !submission) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/municipal/taxes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tax Submissions
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading tax submission details. Please try again.</p>
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
          <Button variant="outline" onClick={() => navigate('/municipal/taxes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tax Submissions
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Tax Submission Details</h1>
            <p className="text-muted-foreground">
              {submission.payer_business_name || `${submission.first_name} ${submission.last_name}`}
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tax Submission Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tax Submission Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Submission ID</Label>
                  <p className="text-base font-mono">{submission.id.slice(0, 8)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tax Type</Label>
                  <p className="text-base">{formatTaxType(submission.tax_type)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(submission.payment_status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Submission Date</Label>
                  <p className="text-base">{formatDate(submission.submission_date)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tax Period</Label>
                  <p className="text-base">
                    {formatPeriod(submission.tax_period_start, submission.tax_period_end)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tax Year</Label>
                  <p className="text-base">{submission.tax_year}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Payer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submission.payer_business_name ? (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Business Name</Label>
                      <p className="text-base">{submission.payer_business_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">EIN</Label>
                      <p className="text-base">{submission.payer_ein || 'N/A'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                      <p className="text-base">{submission.first_name} {submission.last_name}</p>
                    </div>
                    <div></div>
                  </>
                )}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-base">{submission.email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-base">{submission.payer_phone || 'N/A'}</p>
                </div>
                {(submission.payer_street_address || submission.payer_city) && (
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                    <p className="text-base">
                      {[
                        submission.payer_street_address,
                        submission.payer_city,
                        submission.payer_state,
                        submission.payer_zip_code
                      ].filter(Boolean).join(', ') || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calculation Details */}
          {submission.calculation_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Calculation Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SafeHtmlRenderer 
                  content={submission.calculation_notes} 
                  className="prose prose-sm max-w-none"
                  fallback="No calculation details provided"
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
              {loadingDocuments ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : documentsError ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm text-destructive">Error loading documents</p>
                  <p className="text-xs mt-1">{documentsError}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={retryLoadDocuments}
                  >
                    Retry
                  </Button>
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{doc.original_file_name}</span>
                            <Badge variant="outline" className="text-xs">{doc.document_type}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                            <span>Uploaded: {formatDate(doc.created_at)}</span>
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
                          onClick={() => {
                            setSelectedDocument(doc);
                            setDocumentViewerOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={async () => {
                            try {
                              const { data, error } = await supabase.storage
                                .from('tax-documents')
                                .download(doc.storage_path);
                              
                              if (error) {
                                console.error('Error downloading document:', error);
                                toast({
                                  title: "Error",
                                  description: "Failed to download document",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              if (data) {
                                const url = URL.createObjectURL(data);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = doc.original_file_name;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                toast({
                                  title: "Success",
                                  description: "Document downloaded successfully"
                                });
                              }
                            } catch (error) {
                              console.error('Error downloading document:', error);
                              toast({
                                title: "Error",
                                description: "Failed to download document",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No documents uploaded</p>
                  <p className="text-xs mt-1">No supporting documents were provided with this tax submission</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Payment Summary & Timeline */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tax Amount</span>
                  <span className="text-sm font-medium">
                    {formatCurrency((submission.amount_cents || 0) / 100)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Service Fee</span>
                  <span className="text-sm font-medium">
                    {formatCurrency((submission.service_fee_cents || 0) / 100)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium">Total Paid</span>
                  <span className="text-base font-bold">
                    {formatCurrency((submission.total_amount_cents || 0) / 100)}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Payment Method</Label>
                  <p className="text-sm">{getPaymentMethodDisplay(submission)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Payment Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(submission.payment_status)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tax Submission Received</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(submission.submission_date)}
                    </p>
                  </div>
                </div>
                {submission.payment_status === 'paid' && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Payment Processed</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(submission.submission_date)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewerModal
          isOpen={documentViewerOpen}
          onClose={() => {
            setDocumentViewerOpen(false);
            setSelectedDocument(null);
          }}
          document={{
            id: selectedDocument.id,
            file_name: selectedDocument.original_file_name,
            storage_path: selectedDocument.storage_path,
            file_size: selectedDocument.file_size
          }}
          bucketName="tax-documents"
        />
      )}
    </div>
  );
};

export default MunicipalTaxDetail;