import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { usePermit } from '@/hooks/usePermit';
import { formatDate, formatCurrency } from '@/lib/formatters';

const PermitCertificate = () => {
  const { permitId } = useParams<{ permitId: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const { data: permit, isLoading, error } = usePermit(permitId!);
  
  const handlePrint = () => {
    window.print();
  };

  const renderPDFVersion = (permit: any) => {
    return (
      <div style={{ width: '8.5in', backgroundColor: 'white', padding: '0.5in', fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div style={{ backgroundColor: '#1a73e8', color: 'white', padding: '32px', textAlign: 'center', borderBottom: '4px solid #0d47a1' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>BUILDING PERMIT CERTIFICATE</h1>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0' }}>{permit.merchant_name}</h2>
        </div>

        {/* Certificate Body */}
        <div style={{ padding: '32px 0' }}>
          {/* Permit Information */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #e0e0e0', paddingBottom: '24px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a73e8', margin: '0 0 24px 0' }}>PERMIT AUTHORIZED</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 4px 0' }}>PERMIT NUMBER</p>
                <p style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 'bold', margin: '0' }}>{permit.permit_number}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 4px 0' }}>PERMIT TYPE</p>
                <p style={{ fontSize: '16px', fontWeight: '600', margin: '0' }}>{permit.permit_type}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 4px 0' }}>CONSTRUCTION VALUE</p>
                <p style={{ fontSize: '16px', fontWeight: '600', margin: '0' }}>
                  {permit.estimated_construction_value_cents 
                    ? formatCurrency(permit.estimated_construction_value_cents / 100)
                    : 'Not specified'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Property and Permit Information */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: '600', color: '#1a73e8', margin: '0 0 8px 0' }}>PROPERTY ADDRESS</p>
              <p style={{ fontSize: '16px', margin: '0' }}>{permit.property_address}</p>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: '600', color: '#1a73e8', margin: '0 0 8px 0' }}>PERMIT HOLDER</p>
              <p style={{ fontSize: '16px', margin: '0 0 4px 0' }}>{permit.applicant_full_name}</p>
              <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>{permit.applicant_email}</p>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: '600', color: '#1a73e8', margin: '0 0 8px 0' }}>DATE ISSUED</p>
              <p style={{ fontSize: '16px', margin: '0' }}>{formatDate(permit.issued_at)}</p>
            </div>
          </div>

          {/* Scope of Work */}
          <div style={{ borderTop: '2px solid #e0e0e0', paddingTop: '24px', marginBottom: '32px' }}>
            <p style={{ fontWeight: '600', color: '#1a73e8', margin: '0 0 16px 0' }}>SCOPE OF WORK</p>
            <div style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {permit.scope_of_work || 'See application for details'}
            </div>
          </div>

          {/* Legal Notice */}
          <div style={{ backgroundColor: '#f5f5f5', border: '2px solid #e0e0e0', padding: '24px', borderRadius: '4px', marginBottom: '32px' }}>
            <h4 style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '16px', margin: '0 0 16px 0' }}>IMPORTANT NOTICE</h4>
            <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
              <p style={{ margin: '0 0 12px 0' }}>
                <strong>• DISPLAY REQUIREMENT:</strong> This permit must be displayed in a conspicuous location 
                on or near the job site where it can be easily seen by inspectors and officials.
              </p>
              <p style={{ margin: '0 0 12px 0' }}>
                <strong>• INSPECTION REQUIRED:</strong> Work performed under this permit may require inspections. 
                Contact the issuing authority before beginning work to schedule required inspections.
              </p>
              <p style={{ margin: '0 0 12px 0' }}>
                <strong>• VALIDITY:</strong> This permit is valid only for the work described in the approved application. 
                Any changes or additional work may require a separate permit.
              </p>
              <p style={{ margin: '0' }}>
                <strong>• COMPLIANCE:</strong> All work must comply with applicable building codes, zoning ordinances, 
                and other regulations in effect at the time of permit issuance.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '2px solid #e0e0e0', paddingTop: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <p style={{ fontWeight: '600', color: '#1a73e8', margin: '0 0 8px 0' }}>ISSUING AUTHORITY</p>
                <p style={{ fontSize: '14px', margin: '0 0 4px 0' }}>{permit.merchant_name}</p>
                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Building Department</p>
              </div>
              <div>
                <p style={{ fontWeight: '600', color: '#1a73e8', margin: '0 0 8px 0' }}>VERIFICATION</p>
                <p style={{ fontSize: '14px', margin: '0' }}>
                  This permit can be verified online at muninow.com using permit number: {permit.permit_number}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleDownloadPDF = async () => {
    if (!permit) return;
    
    setIsGeneratingPDF(true);
    
    try {
      // Create a temporary container for the PDF version
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '8.5in';
      tempContainer.style.height = 'auto';
      document.body.appendChild(tempContainer);
      
      // Create React root and render the PDF version
      const root = createRoot(tempContainer);
      root.render(renderPDFVersion(permit));
      
      // Wait for React to finish rendering
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the element as an image
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 816, // 8.5in at 96dpi
        height: 1056, // 11in at 96dpi
      });
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'letter');
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit the page
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      
      // Download the PDF
      pdf.save(`permit-certificate-${permit.permit_number}.pdf`);
      
      // Clean up
      root.unmount();
      document.body.removeChild(tempContainer);
      
      toast.success('Certificate PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !permit) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive">Error loading permit certificate. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Only show certificate for issued permits
  if (permit.application_status !== 'issued' || permit.payment_status !== 'paid') {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Certificate is only available for issued and paid permits.
              </p>
              <Button 
                onClick={() => navigate(`/permit/${permitId}`)}
                className="mt-4"
              >
                Return to Permit Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const certificateContent = (
    <div className="max-w-4xl mx-auto bg-white border-2 border-gray-300 shadow-xl">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-8 text-center border-b-4 border-primary-dark">
        <h1 className="text-3xl font-bold tracking-wide">BUILDING PERMIT CERTIFICATE</h1>
        <h2 className="text-xl font-semibold">{permit.merchant_name}</h2>
      </div>

      {/* Certificate Body */}
      <div className="p-8 space-y-8">
        {/* Permit Information */}
        <div className="text-center border-b-2 border-gray-200 pb-6">
          <h3 className="text-2xl font-bold text-primary mb-2">PERMIT AUTHORIZED</h3>
          <div className="grid grid-cols-3 gap-6 mt-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">PERMIT NUMBER</p>
              <p className="text-2xl font-mono font-bold">{permit.permit_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">PERMIT TYPE</p>
              <p className="text-xl font-semibold">{permit.permit_type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">CONSTRUCTION VALUE</p>
              <p className="text-xl font-semibold">
                {permit.estimated_construction_value_cents 
                  ? formatCurrency(permit.estimated_construction_value_cents / 100)
                  : 'Not specified'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Property and Permit Information */}
        <div className="space-y-6">
          <div>
            <p className="font-medium text-primary mb-2">PROPERTY ADDRESS</p>
            <p className="text-lg">{permit.property_address}</p>
          </div>
          
          <div>
            <p className="font-medium text-primary mb-2">PERMIT HOLDER</p>
            <p className="text-lg">{permit.applicant_full_name}</p>
            <p className="text-sm text-muted-foreground">{permit.applicant_email}</p>
          </div>
          
          <div>
            <p className="font-medium text-primary mb-2">DATE ISSUED</p>
            <p className="text-lg">{formatDate(permit.issued_at)}</p>
          </div>
        </div>

        {/* Scope of Work - Full Width Section */}
        <div className="border-t-2 border-gray-200 pt-6">
          <div>
            <p className="font-medium text-primary mb-4">SCOPE OF WORK</p>
            <SafeHtmlRenderer 
              content={permit.scope_of_work}
              fallback="See application for details"
              className="text-base leading-relaxed whitespace-pre-wrap"
            />
          </div>
        </div>

        {/* Legal Notice */}
        <div className="bg-gray-50 border-2 border-gray-200 p-6 rounded">
          <h4 className="font-bold text-center text-lg mb-4">IMPORTANT NOTICE</h4>
          <div className="space-y-3 text-sm">
            <p>
              <strong>• DISPLAY REQUIREMENT:</strong> This permit must be displayed in a conspicuous location 
              on or near the job site where it can be easily seen by inspectors and officials.
            </p>
            <p>
              <strong>• INSPECTION REQUIRED:</strong> Work performed under this permit may require inspections. 
              Contact the issuing authority before beginning work to schedule required inspections.
            </p>
            <p>
              <strong>• VALIDITY:</strong> This permit is valid only for the work described in the approved application. 
              Any changes or additional work may require a separate permit.
            </p>
            <p>
              <strong>• COMPLIANCE:</strong> All work must comply with applicable building codes, zoning ordinances, 
              and other regulations in effect at the time of permit issuance.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="font-medium text-primary mb-2">ISSUING AUTHORITY</p>
              <p className="text-sm">{permit.merchant_name}</p>
              <p className="text-sm text-muted-foreground">Building Department</p>
            </div>
            <div>
              <p className="font-medium text-primary mb-2">VERIFICATION</p>
              <p className="text-sm">
                This permit can be verified online at muninow.com using permit number: {permit.permit_number}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Screen-only navigation */}
      <div className="print:hidden min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/permit/${permitId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Permit Details
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Certificate
              </Button>
              
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Certificate content for screen */}
        {certificateContent}
      </div>

      {/* Print-only version */}
      <div className="hidden print:block">
        <style>
          {`
            @page {
              margin: 0;
              size: letter;
            }
            @media print {
              body { 
                margin: 0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              body * { visibility: hidden; }
              .print-certificate, .print-certificate * { visibility: visible; }
              .print-certificate { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 100%;
                padding: 0.5in;
                margin: 0;
              }
              /* Hide browser headers and footers */
              @page :first {
                margin-top: 0;
              }
              @page {
                @top-left { content: none; }
                @top-center { content: none; }
                @top-right { content: none; }
                @bottom-left { content: none; }
                @bottom-center { content: none; }
                @bottom-right { content: none; }
              }
            }
          `}
        </style>
        <div className="print-certificate">
          {certificateContent}
        </div>
      </div>
    </>
  );
};

export default PermitCertificate;