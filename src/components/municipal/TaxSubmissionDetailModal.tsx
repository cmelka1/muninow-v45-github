import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, FileText, DollarSign, Calendar, FolderOpen, Download, Eye } from 'lucide-react';
import { useTaxSubmissionDetail } from '@/hooks/useTaxSubmissionDetail';
import { useTaxSubmissionDocuments } from '@/hooks/useTaxSubmissionDocuments';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { format } from 'date-fns';

interface TaxSubmissionDetailModalProps {
  submissionId: string | null;
  onClose: () => void;
}

export function TaxSubmissionDetailModal({ submissionId, onClose }: TaxSubmissionDetailModalProps) {
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  
  const { data: submission, isLoading, error } = useTaxSubmissionDetail(submissionId);
  const { getDocuments } = useTaxSubmissionDocuments();

  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  React.useEffect(() => {
    if (submissionId) {
      loadDocuments();
    }
  }, [submissionId]);

  const loadDocuments = async () => {
    if (!submissionId) return;
    
    setDocumentsLoading(true);
    try {
      const docs = await getDocuments(submissionId);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setDocumentsLoading(false);
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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: 'Paid', variant: 'default' as const },
      unpaid: { label: 'Unpaid', variant: 'secondary' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: 'Unpaid', variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleViewDocument = (document: any) => {
    setSelectedDocument(document);
    setIsDocumentViewerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load tax submission</p>
          <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Submission Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">{formatTaxType(submission.tax_type)} Tax Submission</h3>
            <p className="text-sm text-muted-foreground">
              Submission ID: {submission.id}
            </p>
          </div>
          {getStatusBadge(submission.payment_status)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tax Information */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tax Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tax Type:</span>
                  <span className="font-medium">{formatTaxType(submission.tax_type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tax Period:</span>
                  <span>{formatPeriod(submission.tax_period_start, submission.tax_period_end)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tax Year:</span>
                  <span>{submission.tax_year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Submitted:</span>
                  <span>{format(new Date(submission.submission_date), 'MMM d, yyyy h:mm a')}</span>
                </div>
                {submission.calculation_notes && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground block mb-1">Calculation Notes:</span>
                    <div className="bg-muted p-2 rounded">
                      <SafeHtmlRenderer 
                        content={submission.calculation_notes} 
                        className="text-sm"
                        fallback="No calculation notes provided"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Taxpayer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Taxpayer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="text-sm font-medium">
                    {submission.payer_business_name || `${submission.first_name} ${submission.last_name}`}
                  </span>
                </div>
                {submission.payer_ein && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">EIN:</span>
                    <span className="text-sm font-medium">{submission.payer_ein}</span>
                  </div>
                )}
                {submission.email && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="text-sm font-medium">{submission.email}</span>
                  </div>
                )}
                {submission.payer_phone && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Phone:</span>
                    <span className="text-sm font-medium">{submission.payer_phone}</span>
                  </div>
                )}
                {submission.payer_street_address && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Address:</span>
                    <span className="text-sm font-medium">
                      {submission.payer_street_address}, {submission.payer_city}, {submission.payer_state} {submission.payer_zip_code}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment & Documents */}
          <div className="space-y-4">
            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tax Amount:</span>
                  <span className="font-medium">{formatCurrency(submission.amount_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Service Fee:</span>
                  <span className="font-medium">{formatCurrency(submission.service_fee_cents)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm text-muted-foreground font-medium">Total Paid:</span>
                  <span className="font-bold text-green-600">{formatCurrency(submission.total_amount_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Payment Method:</span>
                  <span className="text-sm">{submission.payment_type}</span>
                </div>
              </CardContent>
            </Card>

            {/* Supporting Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Supporting Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.document_type} • {(doc.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <DocumentViewerModal
        isOpen={isDocumentViewerOpen}
        onClose={() => setIsDocumentViewerOpen(false)}
        document={selectedDocument}
        bucketName="tax-documents"
      />
    </>
  );
}