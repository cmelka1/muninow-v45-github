import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  CreditCard, 
  FileText, 
  DollarSign,
  Download,
  Clock,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';
import { useTaxSubmissionDetail } from '@/hooks/useTaxSubmissionDetail';
import { useTaxSubmissionDocuments } from '@/hooks/useTaxSubmissionDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatCurrency, formatTaxType } from '@/lib/formatters';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { MunicipalLayout } from '@/components/layouts/MunicipalLayout';
import { TaxSubmissionCommunication } from '@/components/TaxSubmissionCommunication';
import { AddTaxSubmissionDocumentDialog } from '@/components/AddTaxSubmissionDocumentDialog';
import { TaxSubmissionStatusBadge } from '@/components/TaxSubmissionStatusBadge';
import { supabase } from '@/integrations/supabase/client';

const TaxDetail = () => {
  const { taxId } = useParams<{ taxId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [showAddDocumentDialog, setShowAddDocumentDialog] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  
  const { data: submission, isLoading, error } = useTaxSubmissionDetail(taxId || null);
  const { getDocuments } = useTaxSubmissionDocuments();

  const loadDocuments = async () => {
    if (!submission?.id) return;
    
    setDocumentsLoading(true);
    try {
      const docs = await getDocuments(submission.id);
      setDocuments(docs || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  React.useEffect(() => {
    loadDocuments();
  }, [submission?.id]);


  const formatPeriod = (startDate: string | undefined, endDate: string | undefined) => {
    if (!startDate || !endDate) return 'Unknown Period';
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };


  const handleDocumentDownload = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('tax-documents')
        .download(storagePath);
      
      if (error) throw error;
      
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive">Error loading tax submission details. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isMunicipalUser = profile?.account_type === 'municipal';

  const PageContent = () => (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/taxes')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Taxes
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Tax Submission Details</h1>
              <p className="text-muted-foreground">
                {formatTaxType(submission.tax_type)} - {formatPeriod(submission.tax_period_start, submission.tax_period_end)}
              </p>
            </div>
          </div>
          <TaxSubmissionStatusBadge status={submission.submission_status || 'draft'} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Tax Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tax Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle>Tax Overview</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tax Type</p>
                    <p className="font-semibold">{formatTaxType(submission.tax_type)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tax Period</p>
                    <p className="font-semibold">
                      {formatPeriod(submission.tax_period_start, submission.tax_period_end)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tax Year</p>
                    <p className="font-semibold">{submission.tax_year}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <TaxSubmissionStatusBadge status={submission.submission_status || 'draft'} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Taxpayer Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <CardTitle>Taxpayer Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="font-semibold">
                      {submission.first_name} {submission.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="font-semibold">{submission.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="font-semibold">{submission.payer_phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">EIN</p>
                    <p className="font-semibold">{submission.payer_ein || 'Not provided'}</p>
                  </div>
                </div>
                
                {submission.payer_business_name && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Business Name</p>
                    <p className="font-semibold">{submission.payer_business_name}</p>
                  </div>
                )}
                
                {submission.payer_street_address && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <div className="space-y-1">
                      <p className="font-semibold">{submission.payer_street_address}</p>
                      <p className="font-semibold">
                        {submission.payer_city}, {submission.payer_state} {submission.payer_zip_code}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tax Calculation Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <CardTitle>Tax Calculation Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Tax Amount</span>
                    <span className="font-semibold">{formatCurrency(submission.amount_cents || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Service Fee</span>
                    <span className="font-semibold">{formatCurrency(submission.service_fee_cents || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span>{formatCurrency(submission.total_amount_due_cents || 0)}</span>
                  </div>
                </div>
                
                {submission.calculation_notes && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Calculation Notes</p>
                    <div className="text-sm bg-muted p-3 rounded-md">
                      <SafeHtmlRenderer content={submission.calculation_notes} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supporting Documents */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle>Supporting Documents</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddDocumentDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Add Document
                </Button>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : documents?.length === 0 ? (
                  <p className="text-muted-foreground">No documents uploaded</p>
                ) : (
                  <div className="space-y-2">
                    {documents?.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <div>
                            <p className="font-medium text-sm">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.document_type} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDocumentDownload(doc.storage_path, doc.file_name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Right Column - Payment Information & Timeline */}
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
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <Badge 
                      variant={submission.payment_status === 'paid' ? 'default' : 'outline'}
                      className={
                        submission.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' 
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200'
                      }
                    >
                      {submission.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Amount Paid</span>
                    <span className="font-semibold">{formatCurrency(submission.total_amount_due_cents || 0)}</span>
                  </div>
                  {submission.payment_processed_at && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Paid On</span>
                      <span className="font-semibold">
                        {format(new Date(submission.payment_processed_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <CardTitle>Timeline</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submission.submission_date && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                      <div>
                        <p className="font-medium text-sm">Tax Submission Created</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(submission.submission_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {submission.payment_processed_at && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                      <div>
                        <p className="font-medium text-sm">Payment Processed</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(submission.payment_processed_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Communication */}
            <TaxSubmissionCommunication submissionId={submission.id} />
          </div>
        </div>
      </div>

      {/* Add Document Dialog */}
      <AddTaxSubmissionDocumentDialog
        open={showAddDocumentDialog}
        onOpenChange={setShowAddDocumentDialog}
        taxSubmissionId={submission.id}
        onSuccess={() => {
          // Refresh documents
          loadDocuments();
        }}
      />
    </div>
  );

  if (isMunicipalUser) {
    return (
      <MunicipalLayout>
        <PageContent />
      </MunicipalLayout>
    );
  }

  return <PageContent />;
};

export default TaxDetail;