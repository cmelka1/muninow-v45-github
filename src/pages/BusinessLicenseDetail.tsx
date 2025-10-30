import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, User, Calendar, DollarSign, FileText, AlertCircle, Edit, Plus, Download, Loader2, CreditCard, RefreshCw, CheckCircle } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MunicipalLayout } from '@/components/layouts/MunicipalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useBusinessLicense } from '@/hooks/useBusinessLicense';
import { useBusinessLicenseDocumentsList } from '@/hooks/useBusinessLicenseDocumentsList';
import { useBusinessLicenseDocuments } from '@/hooks/useBusinessLicenseDocuments';
import { useCustomerById } from '@/hooks/useCustomerById';
import { BusinessLicenseStatusBadge } from '@/components/BusinessLicenseStatusBadge';
import { BusinessLicenseRenewalStatusBadge } from '@/components/BusinessLicenseRenewalStatusBadge';
import { BusinessLicenseCommunication } from '@/components/BusinessLicenseCommunication';
import { BusinessLicenseStatusChangeDialog } from '@/components/BusinessLicenseStatusChangeDialog';
import { AddBusinessLicenseDocumentDialog } from '@/components/AddBusinessLicenseDocumentDialog';
import { RenewBusinessLicenseDialog } from '@/components/RenewBusinessLicenseDialog';
import { InlinePaymentFlow } from '@/components/payment/InlinePaymentFlow';
import { AddPaymentMethodDialog } from '@/components/profile/AddPaymentMethodDialog';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { formatEINForDisplay } from '@/lib/formatters';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { BusinessLicenseStatus, useBusinessLicenseWorkflow } from '@/hooks/useBusinessLicenseWorkflow';
import { useBusinessLicenseRenewal } from '@/hooks/useBusinessLicenseRenewal';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const BusinessLicenseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  
  const [downloadingDocument, setDownloadingDocument] = useState<string | null>(null);
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  
  const { data: license, isLoading, error, refetch } = useBusinessLicense(id!);
  const { data: documents, isLoading: documentsLoading, refetch: refetchDocuments } = useBusinessLicenseDocumentsList(id!);
  const { downloadDocument } = useBusinessLicenseDocuments();
  const { updateLicenseStatus, isUpdating, getValidStatusTransitions } = useBusinessLicenseWorkflow();
  const { renewLicense, isRenewing } = useBusinessLicenseRenewal();
  const { customer: municipality, isLoading: municipalityLoading } = useCustomerById(license?.customer_id);

  
  const isMunicipalUser = profile?.account_type === 'municipaladmin';
  const isOwner = license?.user_id === user?.id;
  const canWithdraw = !isMunicipalUser && isOwner && 
    getValidStatusTransitions(license?.application_status as BusinessLicenseStatus).includes('withdrawn');
  
  const canRenew = !isMunicipalUser && isOwner && 
    license?.application_status === 'issued' && 
    license?.renewal_status && 
    ['expiring_soon', 'requires_renewal', 'expired'].includes(license.renewal_status);

  const handleBack = () => {
    if (isMunicipalUser) {
      navigate('/municipal/business-licenses');
    } else {
      navigate('/business-licenses');
    }
  };


  const handleDocumentDownload = async (docItem: any) => {
    setDownloadingDocument(docItem.id);
    try {
      await downloadDocument(docItem.storage_path, docItem.file_name);
      
      toast({
        title: "Download started",
        description: `${docItem.file_name} is being downloaded.`,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download document. Please try again.",
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

  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const handleInitiateRenewal = async () => {
    try {
      const newLicenseId = await renewLicense(license.id);
      navigate(`/municipal/business-license/${newLicenseId}`);
    } catch (error) {
      console.error('Failed to initiate renewal:', error);
    }
  };

  const handleWithdraw = async () => {
    const success = await updateLicenseStatus(license.id, 'withdrawn', withdrawReason || undefined);
    if (success) {
      setShowWithdrawDialog(false);
      setWithdrawReason('');
      refetch();
    }
  };

  const renderPDFVersion = () => {
    if (!license || !municipality) return null;

    return (
      <div className="w-[1200px] min-h-[800px] bg-white p-6 font-serif relative flex flex-col">
        {/* Enhanced decorative corners */}
        <div className="absolute top-4 left-4 w-20 h-20 border-l-4 border-t-4 border-primary"></div>
        <div className="absolute top-4 right-4 w-20 h-20 border-r-4 border-t-4 border-primary"></div>
        <div className="absolute bottom-4 left-4 w-20 h-20 border-l-4 border-b-4 border-primary"></div>
        <div className="absolute bottom-4 right-4 w-20 h-20 border-r-4 border-b-4 border-primary"></div>

        {/* Certificate Border */}
        <div className="border-4 border-primary/20 p-6 relative flex-1 flex flex-col">
          {/* Decorative Corner Elements */}
          <div className="absolute top-2 left-2 w-12 h-12 border-l-2 border-t-2 border-primary/30"></div>
          <div className="absolute top-2 right-2 w-12 h-12 border-r-2 border-t-2 border-primary/30"></div>
          <div className="absolute bottom-2 left-2 w-12 h-12 border-l-2 border-b-2 border-primary/30"></div>
          <div className="absolute bottom-2 right-2 w-12 h-12 border-r-2 border-b-2 border-primary/30"></div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-primary mb-2">
              BUSINESS LICENSE CERTIFICATE
            </h1>
            <div className="text-xl text-muted-foreground mb-4">
              {municipality?.legal_entity_name || 'Municipality'}
            </div>
            <div className="w-32 h-1 bg-primary mx-auto"></div>
          </div>

          {/* Main Content - Flexible Layout */}
          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* License Information Row */}
            <div className="bg-muted/10 p-6 rounded-lg">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <span className="font-medium text-xl text-muted-foreground block mb-2">License Number:</span>
                  <div className="text-3xl font-bold text-primary">
                    #{license.license_number || license.id.slice(0, 8).toUpperCase()}
                  </div>
                </div>
                <div className="text-center">
                  <span className="font-medium text-xl text-muted-foreground block mb-2">License Type:</span>
                  <div className="text-2xl font-semibold break-words leading-tight">
                    {license.business_type || 'Business License'}
                  </div>
                </div>
                <div className="text-center">
                  <span className="font-medium text-xl text-muted-foreground block mb-2">Issue Date:</span>
                  <div className="text-2xl font-semibold">
                    {license.issued_at ? format(new Date(license.issued_at), 'MMMM d, yyyy') : 'Pending'}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Information Row */}
            <div className="bg-muted/10 p-6 rounded-lg">
              {/* Business Name - Prominent Like License Number */}
              <div className="text-center mb-12 pt-2">
                <div className="text-6xl font-bold text-primary">
                  {license.business_legal_name}
                </div>
                {license.doing_business_as && (
                  <div className="text-lg text-muted-foreground mt-1">
                    DBA: {license.doing_business_as}
                  </div>
                )}
              </div>

              {/* Three Column Row: Owner | Business Address | Federal EIN */}
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div className="text-center">
                  <span className="font-medium text-lg text-muted-foreground block mb-2">Business Owner:</span>
                  <div className="text-xl font-semibold">
                    {license.owner_first_name} {license.owner_last_name}
                  </div>
                  {license.owner_title && (
                    <div className="text-base text-muted-foreground mt-1">{license.owner_title}</div>
                  )}
                </div>
                <div className="text-center">
                  <span className="font-medium text-lg text-muted-foreground block mb-2">Business Address:</span>
                  <div className="text-xl font-semibold">
                    {license.business_street_address}
                    {license.business_apt_number && `, #${license.business_apt_number}`}
                  </div>
                  <div className="text-base">
                    {license.business_city}, {license.business_state} {license.business_zip_code}
                  </div>
                </div>
                <div className="text-center">
                  <span className="font-medium text-lg text-muted-foreground block mb-2">Federal EIN:</span>
                  <div className="text-xl font-semibold">
                    {license.federal_ein ? formatEINForDisplay(license.federal_ein) : 'Not provided'}
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Notice Row - Flexible */}
            <div className="bg-muted/10 p-3 rounded-lg mt-auto">
              <h3 className="text-base font-bold text-primary mb-2">LEGAL NOTICE</h3>
              <div className="space-y-1 text-sm leading-tight">
                <p>
                  This certificate serves as official documentation that the above-named business 
                  is duly licensed to operate within the jurisdiction of {municipality?.legal_entity_name || 'this municipality'}.
                </p>
                <p>
                  This license is subject to all applicable laws, regulations, and ordinances.
                </p>
                <p className="font-semibold text-primary">
                  Must be displayed prominently at business location.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDownloadPDF = async () => {
    if (!license) return;

    setIsGeneratingPDF(true);
    toast({
      title: "Generating PDF...",
      description: "Please wait while we generate your certificate.",
    });

    try {
      // Create PDF-optimized version
      const pdfVersionElement = renderPDFVersion();
      if (!pdfVersionElement) {
        throw new Error('Unable to generate PDF version');
      }

      // Create a temporary container for PDF rendering
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.zIndex = '-1';
      document.body.appendChild(tempContainer);

      // Render the PDF version
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(tempContainer);
      
      // Wrap in a promise to ensure rendering is complete
      await new Promise<void>((resolve) => {
        root.render(pdfVersionElement);
        
        // Give React time to render
        setTimeout(resolve, 200);
      });

      // Capture the PDF version
      const pdfElement = tempContainer.firstElementChild as HTMLElement;
      const canvas = await html2canvas(pdfElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 1200,
        height: 800,
      });

      // Create PDF in landscape orientation
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Define frame-optimized dimensions (A4 landscape: 297x210mm)
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 8;
      
      const maxWidth = pageWidth - (2 * margin);
      const maxHeight = pageHeight - (2 * margin);
      
      const canvasAspectRatio = canvas.width / canvas.height;
      const targetAspectRatio = maxWidth / maxHeight;
      
      let certWidth, certHeight;
      if (canvasAspectRatio > targetAspectRatio) {
        certWidth = maxWidth;
        certHeight = maxWidth / canvasAspectRatio;
      } else {
        certHeight = maxHeight;
        certWidth = maxHeight * canvasAspectRatio;
      }
      
      const x = (pageWidth - certWidth) / 2;
      const y = (pageHeight - certHeight) / 2;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, certWidth, certHeight);

      // Generate filename
      const licenseNumber = license.license_number || license.id.slice(0, 8).toUpperCase();
      const filename = `Business-License-Certificate-${licenseNumber}.pdf`;
      
      pdf.save(filename);
      toast({
        title: "Success!",
        description: "PDF downloaded successfully!",
      });

      // Cleanup
      root.unmount();
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
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
            {isMunicipalUser && license.application_status === 'issued' && license.renewal_status && license.renewal_status !== 'active' && (
              <BusinessLicenseRenewalStatusBadge 
                renewalStatus={license.renewal_status}
                expiresAt={license.expires_at}
              />
            )}
            {isMunicipalUser && license.application_status === 'issued' && 
             license.renewal_status && ['active', 'expiring_soon'].includes(license.renewal_status) && (
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Eligible for Renewal
              </Badge>
            )}
            {isMunicipalUser && license.application_status !== 'issued' && (
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
            {license.application_status === 'issued' && license.payment_status === 'paid' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF || municipalityLoading}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isGeneratingPDF ? 'Generating...' : 'Download License'}
              </Button>
            )}
            {canRenew && (
              <Button
                size="sm"
                onClick={() => setShowRenewDialog(true)}
                className={`flex items-center gap-2 ${
                  license.renewal_status === 'expired' 
                    ? 'bg-red-600 hover:bg-red-700'
                    : license.renewal_status === 'requires_renewal'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                <RefreshCw className="h-4 w-4" />
                Renew License
              </Button>
            )}
            {canWithdraw && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWithdrawDialog(true)}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                <AlertCircle className="h-4 w-4" />
                Withdraw
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
              
              {/* Expiration Information - only show for issued licenses */}
              {license.application_status === 'issued' && license.expires_at && (
                <>
                  <Separator />
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        License Expiration Details
                      </h4>
                      {license.renewal_status && (
                        <BusinessLicenseRenewalStatusBadge 
                          renewalStatus={license.renewal_status}
                          expiresAt={license.expires_at}
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Issue Date</label>
                        <p className="text-sm font-medium">{formatDate(license.issued_at)}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Expiration Date</label>
                        <p className="text-sm font-medium">{formatDate(license.expires_at)}</p>
                      </div>
                      {license.is_renewal && license.original_issue_date && (
                        <>
                          <div>
                            <label className="text-xs font-medium text-gray-500">Original Issue Date</label>
                            <p className="text-sm">{formatDate(license.original_issue_date)}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500">Renewal Generation</label>
                            <p className="text-sm">
                              {license.renewal_generation ? `${license.renewal_generation}${getOrdinalSuffix(license.renewal_generation)} Renewal` : 'N/A'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Renewal Eligibility Indicator */}
                    {['active', 'expiring_soon'].includes(license.renewal_status || '') && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center gap-2 text-sm text-blue-800">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">This license is eligible for renewal</span>
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={handleInitiateRenewal}
                          disabled={isRenewing}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {isRenewing ? 'Processing...' : 'Initiate Renewal'}
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
              
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
          {/* Payment Management - Only show for business users */}
          {!isMunicipalUser && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {license.application_status === 'approved' && license.payment_status !== 'paid' && (
                  <InlinePaymentFlow
                    entityType="business_license"
                    entityId={license.id}
                    entityName={`Business License - ${license.business_legal_name}`}
                    customerId={license.customer_id}
                    merchantId={license.merchant_id || ''}
                    baseAmountCents={license.base_amount_cents || license.total_amount_cents || 0}
                    initialExpanded={true}
                    onPaymentSuccess={() => {
                      toast({
                        title: "Payment Successful",
                        description: "Your business license payment has been processed successfully.",
                      });
                      refetch();
                    }}
                    onPaymentError={(error) => {
                      console.error('Payment error:', error);
                    }}
                    onAddPaymentMethod={() => setIsAddPaymentDialogOpen(true)}
                  />
                )}

                {license.payment_status === 'paid' ? (
                  <div className="pt-2 space-y-2">
                    <Button className="w-full" disabled variant="outline">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Payment Complete
                    </Button>
                    
                    <p className="text-xs text-green-600 mt-2">
                      Your business license fee has been paid
                    </p>
                  </div>
                ) : license.application_status !== 'approved' ? (
                  <div className="pt-2">
                    <Button className="w-full" disabled variant="outline">
                      Payment Unavailable
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Payment processing will be available once your application is approved
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Payment Information - Only show for municipal users */}
          {isMunicipalUser && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  <CardTitle>Payment Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {/* Status */}
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <Badge 
                      variant={license.payment_status === 'paid' ? 'default' : 'outline'}
                      className={
                        license.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' 
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200'
                      }
                    >
                      {license.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                  
                  {/* Paid On */}
                  {license.payment_processed_at && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Paid On</span>
                      <span className="font-semibold">
                        {format(new Date(license.payment_processed_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  
                  {/* Separator before payment breakdown */}
                  <Separator />
                  
                  {/* Payment Details Breakdown */}
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Base Amount</span>
                    <span className="font-semibold">{formatCurrency(license.base_amount_cents || 0)}</span>
                  </div>
                  {/* Only show Service Fee and Total for paid transactions */}
                  {license.payment_status === 'paid' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Service Fee</span>
                        <span className="font-semibold">{formatCurrency(license.service_fee_cents || 0)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Paid</span>
                        <span>{formatCurrency(license.total_amount_cents || 0)}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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

      
      {/* Add Payment Method Dialog */}
      <AddPaymentMethodDialog
        open={isAddPaymentDialogOpen}
        onOpenChange={setIsAddPaymentDialogOpen}
        onSuccess={() => {
          // Payment method added successfully - the InlinePaymentFlow will auto-refresh
        }}
      />

      {/* Withdraw License Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Business License Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to withdraw this business license application? This action cannot be undone.
            </p>
            <div className="space-y-2">
              <Label htmlFor="withdraw-reason">Reason for withdrawal (optional)</Label>
              <Textarea
                id="withdraw-reason"
                placeholder="Please provide a reason for withdrawing your application..."
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowWithdrawDialog(false);
                setWithdrawReason('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleWithdraw}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                'Withdraw Application'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Business License Dialog */}
      <RenewBusinessLicenseDialog
        open={showRenewDialog}
        onOpenChange={setShowRenewDialog}
        license={{
          id: license.id,
          license_number: license.license_number,
          business_legal_name: license.business_legal_name,
          business_type: license.business_type,
          expires_at: license.expires_at,
          base_amount_cents: license.base_amount_cents,
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
        <PageContent />
      )}
    </div>
  );
};