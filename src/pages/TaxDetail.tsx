import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, User, Clock, Receipt, Calendar, Building, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { useTaxSubmissionDetail } from '@/hooks/useTaxSubmissionDetail';
import { useTaxSubmissionDocuments } from '@/hooks/useTaxSubmissionDocuments';
import { formatCurrency, formatDate, smartAbbreviateFilename } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TaxDetail: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [downloadingDocument, setDownloadingDocument] = useState<string | null>(null);
  
  const { data: submission, isLoading, error } = useTaxSubmissionDetail(submissionId || '');
  const { getDocuments } = useTaxSubmissionDocuments();
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  // Load documents when submission is loaded
  React.useEffect(() => {
    if (submission?.id) {
      console.log('Loading documents for submission:', submission.id);
      setDocumentsLoading(true);
      setDocumentsError(null);
      
      getDocuments(submission.id)
        .then((docs) => {
          console.log('Documents loaded successfully:', docs);
          setDocuments(docs);
        })
        .catch((error) => {
          console.error('Failed to load documents:', error);
          setDocumentsError(error.message || 'Failed to load documents');
          setDocuments([]);
        })
        .finally(() => setDocumentsLoading(false));
    }
  }, [submission?.id]); // Removed getDocuments from dependency array to fix infinite loop

  const handleDocumentDownload = async (document: any) => {
    setDownloadingDocument(document.id);
    try {
      const { data, error } = await supabase.storage
        .from('tax-documents')
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

  const formatTaxType = (taxType: string) => {
    const typeMap: Record<string, string> = {
      'food_beverage': 'Food & Beverage',
      'hotel_motel': 'Hotel & Motel',
      'amusement': 'Amusement'
    };
    return typeMap[taxType] || taxType;
  };

  const formatPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const end = new Date(endDate).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    return `${start} - ${end}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading tax submission details. Please try again.</p>
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
            onClick={() => navigate('/taxes')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tax Submission</h1>
            <p className="text-muted-foreground">Submission #{submission.id}</p>
          </div>
          {getStatusBadge(submission.payment_status)}
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
              <Receipt className="h-5 w-5" />
              Tax Submission Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Submission ID</Label>
                <p className="text-base font-mono">{submission.id}</p>
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
                <Label className="text-sm font-medium text-muted-foreground">Tax Period</Label>
                <p className="text-base">{formatPeriod(submission.tax_period_start, submission.tax_period_end)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Tax Year</Label>
                <p className="text-base">{submission.tax_year}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
                <p className="text-base">{formatDate(submission.submission_date)}</p>
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
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Business Name</Label>
                  <p className="text-base">{submission.payer_business_name}</p>
                </div>
              ) : (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="text-base">{submission.first_name} {submission.last_name}</p>
                </div>
              )}
              {submission.payer_ein && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">EIN</Label>
                  <p className="text-base font-mono">{submission.payer_ein}</p>
                </div>
              )}
              {submission.email && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-base">{submission.email}</p>
                </div>
              )}
              {submission.payer_phone && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-base">{submission.payer_phone}</p>
                </div>
              )}
            </div>
            {(submission.payer_street_address || submission.payer_city) && (
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                <div className="text-base">
                  {submission.payer_street_address && <p>{submission.payer_street_address}</p>}
                  {(submission.payer_city || submission.payer_state || submission.payer_zip_code) && (
                    <p>
                      {submission.payer_city}
                      {submission.payer_state && `, ${submission.payer_state}`}
                      {submission.payer_zip_code && ` ${submission.payer_zip_code}`}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calculation Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calculation Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submission.calculation_notes && (
              <SafeHtmlRenderer 
                content={submission.calculation_notes}
                fallback="No calculation notes provided"
              />
            )}
          </CardContent>
        </Card>

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
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    console.log('Retrying document load for submission:', submission?.id);
                    setDocumentsLoading(true);
                    setDocumentsError(null);
                    if (submission?.id) {
                      getDocuments(submission.id)
                        .then((docs) => {
                          console.log('Retry successful, documents loaded:', docs);
                          setDocuments(docs);
                        })
                        .catch((error) => {
                          console.error('Retry failed:', error);
                          setDocumentsError(error.message || 'Failed to load documents');
                        })
                        .finally(() => setDocumentsLoading(false));
                    }
                  }}
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
        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tax Amount</span>
                <span className="text-sm">{formatCurrency(submission.amount_cents / 100)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Service Fee</span>
                <span className="text-sm">{formatCurrency(submission.service_fee_cents / 100)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Paid</span>
                  <span className="font-semibold">{formatCurrency(submission.total_amount_cents / 100)}</span>
                </div>
              </div>
            </div>
            
          </CardContent>
        </Card>

        {/* Submission Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Submitted</p>
                  <p className="text-xs text-muted-foreground">{formatDate(submission.submission_date)}</p>
                </div>
              </div>
              {submission.paid_at && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">Payment Processed</p>
                    <p className="text-xs text-muted-foreground">{formatDate(submission.paid_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default TaxDetail;