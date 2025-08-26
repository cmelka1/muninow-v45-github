import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, User, Calendar, DollarSign, FileText, AlertCircle, Edit, Plus, Eye, Download, Loader2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MunicipalLayout } from '@/components/layouts/MunicipalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusinessLicense } from '@/hooks/useBusinessLicense';
import { useBusinessLicenseDocumentsList } from '@/hooks/useBusinessLicenseDocumentsList';
import { useBusinessLicenseDocuments } from '@/hooks/useBusinessLicenseDocuments';
import { BusinessLicenseStatusBadge } from '@/components/BusinessLicenseStatusBadge';
import { BusinessLicenseCommunication } from '@/components/BusinessLicenseCommunication';
import { BusinessLicenseStatusChangeDialog } from '@/components/BusinessLicenseStatusChangeDialog';
import { AddBusinessLicenseDocumentDialog } from '@/components/AddBusinessLicenseDocumentDialog';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import { BusinessLicensePaymentManagement } from '@/components/BusinessLicensePaymentManagement';
import { AddPaymentMethodDialog } from '@/components/profile/AddPaymentMethodDialog';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { formatEINForDisplay } from '@/lib/formatters';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { BusinessLicenseStatus } from '@/hooks/useBusinessLicenseWorkflow';
import { useToast } from '@/hooks/use-toast';

export const BusinessLicenseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [downloadingDocument, setDownloadingDocument] = useState<string | null>(null);
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  
  const { data: license, isLoading, error, refetch } = useBusinessLicense(id!);
  const { data: documents, isLoading: documentsLoading, refetch: refetchDocuments } = useBusinessLicenseDocumentsList(id!);
  const { getDocumentUrl } = useBusinessLicenseDocuments();
  
  const isMunicipalUser = user?.user_metadata?.account_type === 'municipal';

  const handleBack = () => {
    if (isMunicipalUser) {
      navigate('/municipal/business-licenses');
    } else {
      navigate('/business-licenses');
    }
  };

  const handleDocumentView = async (document: any) => {
    try {
      const url = await getDocumentUrl(document.storage_path);
      if (url) {
        setSelectedDocument({ ...document, signedUrl: url });
      }
    } catch (error) {
      console.error('Error getting document URL:', error);
      toast({
        title: "Error",
        description: "Failed to load document preview",
        variant: "destructive"
      });
    }
  };

  const handleDocumentDownload = async (document: any) => {
    setDownloadingDocument(document.id);
    try {
      const url = await getDocumentUrl(document.storage_path);
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = document.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive"
      });
    } finally {
      setDownloadingDocument(null);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
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

  if (error || !license) {
    return (
      <div className="min-h-screen bg-gray-100">
        {isMunicipalUser ? (
          <MunicipalLayout>
            <div className="p-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">License Not Found</h3>
                    <p className="text-gray-600 mb-4">The requested business license could not be found.</p>
                    <Button onClick={handleBack}>Go Back</Button>
                  </div>
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
                    <CardContent className="p-6">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">License Not Found</h3>
                        <p className="text-gray-600 mb-4">The requested business license could not be found.</p>
                        <Button onClick={handleBack}>Go Back</Button>
                      </div>
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
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Business License #{license.license_number || license.id.slice(0, 8)}
            </h1>
            <p className="text-gray-600">{license.business_legal_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <BusinessLicenseStatusBadge status={license.application_status} />
            {isMunicipalUser && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusDialog(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Change Status
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* License Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                License Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">License Type</label>
                  <p className="text-sm">{license.business_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <BusinessLicenseStatusBadge status={license.application_status} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Application Date</label>
                  <p className="text-sm">{formatDate(license.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted Date</label>
                  <p className="text-sm">{formatDate(license.submitted_at)}</p>
                </div>
              </div>
              
              {license.business_description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Business Description</label>
                  <p className="text-sm mt-1">{license.business_description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Legal Name</label>
                  <p className="text-sm">{license.business_legal_name}</p>
                </div>
                {license.doing_business_as && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">DBA</label>
                    <p className="text-sm">{license.doing_business_as}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Business Type</label>
                  <p className="text-sm">{license.business_type}</p>
                </div>
                {license.federal_ein && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Federal EIN</label>
                    <p className="text-sm">{formatEINForDisplay(license.federal_ein)}</p>
                  </div>
                )}
                {license.state_tax_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">State Tax ID</label>
                    <p className="text-sm">{license.state_tax_id}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Business Address</label>
                  <p className="text-sm">
                    {license.business_street_address}
                    {license.business_apt_number && `, ${license.business_apt_number}`}
                    <br />
                    {license.business_city}, {license.business_state} {license.business_zip_code}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {license.business_phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-sm">{license.business_phone}</p>
                  </div>
                )}
                {license.business_email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm">{license.business_email}</p>
                  </div>
                )}
              </div>
              
              {license.additional_info?.additionalDetails && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Additional Business Information</label>
                    <div className="mt-2">
                      <SafeHtmlRenderer content={license.additional_info.additionalDetails} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Owner Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Owner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-sm">{license.owner_first_name} {license.owner_last_name}</p>
                </div>
                {license.owner_title && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Title</label>
                    <p className="text-sm">{license.owner_title}</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="text-sm mt-1">
                  {license.owner_street_address}
                  {license.owner_apt_number && `, ${license.owner_apt_number}`}
                  <br />
                  {license.owner_city}, {license.owner_state} {license.owner_zip_code}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {license.owner_phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-sm">{license.owner_phone}</p>
                  </div>
                )}
                {license.owner_email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm">{license.owner_email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
                            <Badge variant="outline" className="text-xs">
                              {doc.document_type}
                            </Badge>
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
          <BusinessLicensePaymentManagement 
            license={license}
            onAddPaymentMethod={() => setIsAddPaymentDialogOpen(true)}
          />

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
                <div className="flex justify-between text-sm">
                  <span>Created</span>
                  <span className="text-gray-600">{formatDate(license.created_at)}</span>
                </div>
                {license.submitted_at && (
                  <div className="flex justify-between text-sm">
                    <span>Submitted</span>
                    <span className="text-gray-600">{formatDate(license.submitted_at)}</span>
                  </div>
                )}
                {license.under_review_at && (
                  <div className="flex justify-between text-sm">
                    <span>Under Review</span>
                    <span className="text-gray-600">{formatDate(license.under_review_at)}</span>
                  </div>
                )}
                {license.information_requested_at && (
                  <div className="flex justify-between text-sm">
                    <span>Info Requested</span>
                    <span className="text-gray-600">{formatDate(license.information_requested_at)}</span>
                  </div>
                )}
                {license.approved_at && (
                  <div className="flex justify-between text-sm">
                    <span>Approved</span>
                    <span className="text-gray-600">{formatDate(license.approved_at)}</span>
                  </div>
                )}
                {license.issued_at && (
                  <div className="flex justify-between text-sm">
                    <span>Issued</span>
                    <span className="text-gray-600">{formatDate(license.issued_at)}</span>
                  </div>
                )}
                {license.denied_at && (
                  <div className="flex justify-between text-sm">
                    <span>Denied</span>
                    <span className="text-gray-600">{formatDate(license.denied_at)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Communication */}
          <BusinessLicenseCommunication licenseId={license.id} />
        </div>
      </div>

      {/* Status Change Dialog */}
      {isMunicipalUser && (
        <BusinessLicenseStatusChangeDialog
          isOpen={showStatusDialog}
          onClose={() => setShowStatusDialog(false)}
          licenseId={license.id}
          currentStatus={license.application_status as BusinessLicenseStatus}
          onStatusChanged={() => {
            refetch();
            setShowStatusDialog(false);
          }}
        />
      )}

      {/* Add Document Dialog */}
      <AddBusinessLicenseDocumentDialog
        open={addDocumentOpen}
        onOpenChange={setAddDocumentOpen}
        licenseId={license.id}
        customerId={license.customer_id}
        merchantId={license.merchant_id}
        merchantName={license.merchant_id ? "Business License" : undefined}
        onSuccess={() => {
          refetchDocuments();
          setAddDocumentOpen(false);
        }}
      />

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewerModal
          isOpen={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
          document={selectedDocument}
          bucketName="business-license-documents"
        />
      )}
      
      {/* Add Payment Method Dialog */}
      <AddPaymentMethodDialog
        open={isAddPaymentDialogOpen}
        onOpenChange={setIsAddPaymentDialogOpen}
        onSuccess={() => {
          // Payment method added successfully - no need to do anything specific
          // The BusinessLicensePaymentManagement component will auto-refresh
        }}
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
    </div>
  );
};