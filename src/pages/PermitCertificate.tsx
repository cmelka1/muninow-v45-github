import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { usePermit } from '@/hooks/usePermit';
import { formatDate, formatCurrency } from '@/lib/formatters';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const PermitCertificate = () => {
  const { permitId } = useParams<{ permitId: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const { data: permit, isLoading, error } = usePermit(permitId!);
  
  const handlePrint = () => {
    window.print();
  };

  const renderHtmlContentWithInlineStyles = (htmlContent: string | null) => {
    if (!htmlContent || htmlContent.trim() === '' || htmlContent === 'None') {
      return <div style={{ fontSize: '16px', lineHeight: '1.6' }}>See application for details</div>;
    }
    
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const processNode = (node: ChildNode): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        return text ? text : null;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const children = Array.from(element.childNodes)
          .map((child, index) => processNode(child))
          .filter(child => child !== null);
        
        const key = Math.random().toString(36).substr(2, 9);
        
        switch (element.tagName.toLowerCase()) {
          case 'p':
            return (
              <div key={key} style={{ marginBottom: '16px', fontSize: '16px', lineHeight: '1.6' }}>
                {children.length > 0 ? children : <br />}
              </div>
            );
          case 'br':
            return <br key={key} />;
          case 'strong':
          case 'b':
            return <strong key={key} style={{ fontWeight: 'bold' }}>{children}</strong>;
          case 'em':
          case 'i':
            return <em key={key} style={{ fontStyle: 'italic' }}>{children}</em>;
          case 'ul':
            return (
              <ul key={key} style={{ marginBottom: '16px', paddingLeft: '24px', listStyleType: 'disc' }}>
                {children}
              </ul>
            );
          case 'ol':
            return (
              <ol key={key} style={{ marginBottom: '16px', paddingLeft: '24px', listStyleType: 'decimal' }}>
                {children}
              </ol>
            );
          case 'li':
            return (
              <li key={key} style={{ marginBottom: '8px', fontSize: '16px', lineHeight: '1.6' }}>
                {children}
              </li>
            );
          case 'div':
            return (
              <div key={key} style={{ marginBottom: '8px', fontSize: '16px', lineHeight: '1.6' }}>
                {children}
              </div>
            );
          default:
            return (
              <span key={key} style={{ fontSize: '16px', lineHeight: '1.6' }}>
                {children}
              </span>
            );
        }
      }
      
      return null;
    };
    
    const processedContent = Array.from(tempDiv.childNodes)
      .map((child, index) => processNode(child))
      .filter(child => child !== null);
    
    return (
      <div style={{ fontSize: '16px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
        {processedContent.length > 0 ? processedContent : 'See application for details'}
      </div>
    );
  };

  const renderPDFVersion = (permit: any) => {
    return (
      <div className="max-w-4xl mx-auto bg-white" style={{ width: '8.5in', padding: '0.5in' }}>
        <style>
          {`
            .pdf-section { 
              page-break-inside: avoid; 
              margin-bottom: 24px;
            }
            .pdf-header { 
              page-break-after: avoid; 
            }
            .pdf-scope-section { 
              page-break-before: auto;
              page-break-inside: auto;
            }
            .pdf-scope-content p { 
              page-break-inside: avoid;
              margin-bottom: 12px;
            }
            .pdf-legal-notice { 
              page-break-before: auto;
              page-break-inside: avoid;
            }
            .pdf-footer { 
              page-break-before: avoid;
            }
            @media print {
              .pdf-section { break-inside: avoid; }
              .pdf-scope-content p { break-inside: avoid; }
            }
          `}
        </style>

        {/* Header Section */}
        <div className="pdf-section pdf-header bg-blue-600 text-white p-6 text-center border-b-4 border-blue-800 mb-6">
          <h1 className="text-3xl font-bold tracking-wide">BUILDING PERMIT CERTIFICATE</h1>
          <h2 className="text-xl font-semibold mt-2">{permit.merchant_name}</h2>
        </div>

        {/* Permit Information Section */}
        <div className="pdf-section text-center border-b-2 border-gray-200 pb-6">
          <h3 className="text-2xl font-bold text-blue-600 mb-4">PERMIT AUTHORIZED</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">PERMIT NUMBER</p>
              <p className="text-xl font-mono font-bold">{permit.permit_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">PERMIT TYPE</p>
              <p className="text-lg font-semibold">{permit.permit_type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">CONSTRUCTION VALUE</p>
              <p className="text-lg font-semibold">
                {permit.estimated_construction_value_cents 
                  ? formatCurrency(permit.estimated_construction_value_cents / 100)
                  : 'Not specified'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Property and Permit Information Section */}
        <div className="pdf-section space-y-4">
          <div>
            <p className="font-medium text-blue-600 mb-2">PROPERTY ADDRESS</p>
            <p className="text-base">{permit.property_address}</p>
          </div>
          
          <div>
            <p className="font-medium text-blue-600 mb-2">PERMIT HOLDER</p>
            <p className="text-base">{permit.applicant_full_name}</p>
            <p className="text-sm text-gray-600">{permit.applicant_email}</p>
          </div>
          
          <div>
            <p className="font-medium text-blue-600 mb-2">DATE ISSUED</p>
            <p className="text-base">{formatDate(permit.issued_at)}</p>
          </div>
        </div>

        {/* Scope of Work Section */}
        <div className="pdf-scope-section border-t-2 border-gray-200 pt-6">
          <p className="font-medium text-blue-600 mb-4">SCOPE OF WORK</p>
          <div className="pdf-scope-content">
            {renderHtmlContentWithInlineStyles(permit.scope_of_work)}
          </div>
        </div>

        {/* Legal Notice Section */}
        <div className="pdf-legal-notice bg-gray-50 border-2 border-gray-200 p-4 rounded mt-6">
          <h4 className="font-bold text-center text-base mb-3">IMPORTANT NOTICE</h4>
          <div className="space-y-2 text-sm">
            <p style={{ pageBreakInside: 'avoid' }}>
              <strong>• DISPLAY REQUIREMENT:</strong> This permit must be displayed in a conspicuous location 
              on or near the job site where it can be easily seen by inspectors and officials.
            </p>
            <p style={{ pageBreakInside: 'avoid' }}>
              <strong>• INSPECTION REQUIRED:</strong> Work performed under this permit may require inspections. 
              Contact the issuing authority before beginning work to schedule required inspections.
            </p>
            <p style={{ pageBreakInside: 'avoid' }}>
              <strong>• VALIDITY:</strong> This permit is valid only for the work described in the approved application. 
              Any changes or additional work may require a separate permit.
            </p>
            <p style={{ pageBreakInside: 'avoid' }}>
              <strong>• COMPLIANCE:</strong> All work must comply with applicable building codes, zoning ordinances, 
              and other regulations in effect at the time of permit issuance.
            </p>
          </div>
        </div>

        {/* Footer Section */}
        <div className="pdf-footer border-t-2 border-gray-200 pt-4 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-blue-600 mb-2">ISSUING AUTHORITY</p>
              <p className="text-sm">{permit.merchant_name}</p>
              <p className="text-sm text-gray-600">Building Department</p>
            </div>
            <div>
              <p className="font-medium text-blue-600 mb-2">VERIFICATION</p>
              <p className="text-sm">
                This permit can be verified online at muninow.com using permit number: {permit.permit_number}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to parse HTML content and extract text
  const parseHtmlContent = (html: string): { text: string; isBold?: boolean; isItalic?: boolean; isList?: boolean }[] => {
    if (!html) return [];
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const elements: { text: string; isBold?: boolean; isItalic?: boolean; isList?: boolean }[] = [];
    
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          const parent = node.parentElement;
          elements.push({
            text,
            isBold: parent?.tagName === 'STRONG' || parent?.tagName === 'B',
            isItalic: parent?.tagName === 'EM' || parent?.tagName === 'I',
            isList: parent?.tagName === 'LI'
          });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        
        // Handle paragraph breaks
        if (element.tagName === 'P' && elements.length > 0) {
          elements.push({ text: '\n' });
        }
        
        // Handle list items
        if (element.tagName === 'LI') {
          elements.push({ text: '• ', isList: true });
        }
        
        // Process child nodes
        Array.from(node.childNodes).forEach(processNode);
        
        // Add line break after paragraphs and list items
        if (element.tagName === 'P' || element.tagName === 'LI') {
          elements.push({ text: '\n' });
        }
      }
    };
    
    Array.from(tempDiv.childNodes).forEach(processNode);
    return elements.filter(el => el.text.trim() !== '');
  };

  // Helper function to add text with automatic page breaks
  const addTextWithPageBreaks = (
    pdf: jsPDF, 
    text: string, 
    x: number, 
    y: number, 
    maxWidth: number, 
    fontSize: number = 10,
    isBold: boolean = false,
    isItalic: boolean = false
  ): number => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : isItalic ? 'italic' : 'normal');
    
    const lines = pdf.splitTextToSize(text, maxWidth);
    const lineHeight = (fontSize / 72) * 1.2; // Convert to inches with spacing
    let currentY = y;
    
    for (const line of lines) {
      // Check if we need a new page
      if (currentY + lineHeight > 10.5) { // 11" - 0.5" bottom margin
        pdf.addPage();
        currentY = 0.5; // Top margin
      }
      
      pdf.text(line, x, currentY);
      currentY += lineHeight;
    }
    
    return currentY;
  };

  const handleDownloadPDF = async () => {
    if (!permit) return;
    
    setIsGeneratingPDF(true);
    toast.loading('Generating PDF certificate...');
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
      });

      const pageWidth = 8.5;
      const pageHeight = 11;
      const margin = 0.5;
      const contentWidth = pageWidth - (margin * 2);
      let currentY = margin;

      // Header Section
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BUILDING PERMIT CERTIFICATE', pageWidth / 2, currentY, { align: 'center' });
      currentY += 0.4;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(permit.merchant_name || 'Municipality', pageWidth / 2, currentY, { align: 'center' });
      currentY += 0.3;

      pdf.text('Building Department', pageWidth / 2, currentY, { align: 'center' });
      currentY += 0.5;

      // Border around certificate
      pdf.rect(margin, margin, contentWidth, pageHeight - (margin * 2));
      currentY += 0.2;

      // Permit Information Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PERMIT AUTHORIZED', pageWidth / 2, currentY, { align: 'center' });
      currentY += 0.4;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const permitInfo = [
        [`Permit Number:`, permit.permit_number],
        [`Permit Type:`, permit.permit_type],
        [`Status:`, permit.application_status.replace('_', ' ').toUpperCase()],
        [`Issue Date:`, permit.issued_at ? formatDate(permit.issued_at) : 'Pending'],
        [`Construction Value:`, formatCurrency(permit.estimated_construction_value_cents / 100)]
      ];

      for (const [label, value] of permitInfo) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, margin + 0.2, currentY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, margin + 2, currentY);
        currentY += 0.2;
      }

      currentY += 0.3;

      // Property Information Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PROPERTY INFORMATION', margin + 0.2, currentY);
      currentY += 0.3;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Property Address:', margin + 0.2, currentY);
      pdf.setFont('helvetica', 'normal');
      currentY = addTextWithPageBreaks(pdf, permit.property_address, margin + 0.2, currentY + 0.2, contentWidth - 0.4);
      currentY += 0.3;

      // Permit Holder Information
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PERMIT HOLDER INFORMATION', margin + 0.2, currentY);
      currentY += 0.3;

      pdf.setFontSize(10);
      const holderInfo = [
        [`Name:`, permit.applicant_full_name],
        [`Email:`, permit.applicant_email],
        [`Phone:`, permit.applicant_phone || 'N/A'],
        [`Address:`, permit.applicant_address || 'N/A']
      ];

      for (const [label, value] of holderInfo) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, margin + 0.2, currentY);
        pdf.setFont('helvetica', 'normal');
        currentY = addTextWithPageBreaks(pdf, value, margin + 1.5, currentY, contentWidth - 1.7, 10);
        currentY += 0.1;
      }

      currentY += 0.3;

      // Scope of Work Section (can span multiple pages)
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SCOPE OF WORK', margin + 0.2, currentY);
      currentY += 0.3;

      if (permit.scope_of_work) {
        const scopeElements = parseHtmlContent(permit.scope_of_work);
        
        for (const element of scopeElements) {
          if (element.text === '\n') {
            currentY += 0.15;
            continue;
          }
          
          currentY = addTextWithPageBreaks(
            pdf, 
            element.text, 
            margin + 0.2, 
            currentY, 
            contentWidth - 0.4, 
            10,
            element.isBold,
            element.isItalic
          );
          
          if (element.isList) {
            currentY += 0.1;
          }
        }
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.text('See application for details', margin + 0.2, currentY);
        currentY += 0.2;
      }

      // Check if we need a new page for the legal notice
      if (currentY > 9) {
        pdf.addPage();
        currentY = margin;
      } else {
        currentY += 0.5;
      }

      // Legal Notice Section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('IMPORTANT NOTICE', margin + 0.2, currentY);
      currentY += 0.3;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const legalNotices = [
        '• DISPLAY REQUIREMENT: This permit must be displayed in a conspicuous location on or near the job site where it can be easily seen by inspectors and officials.',
        '• INSPECTION REQUIRED: Work performed under this permit may require inspections. Contact the issuing authority before beginning work to schedule required inspections.',
        '• VALIDITY: This permit is valid only for the work described in the approved application. Any changes or additional work may require a separate permit.',
        '• COMPLIANCE: All work must comply with applicable building codes, zoning ordinances, and other regulations in effect at the time of permit issuance.'
      ];
      
      for (const notice of legalNotices) {
        currentY = addTextWithPageBreaks(pdf, notice, margin + 0.2, currentY, contentWidth - 0.4, 9);
        currentY += 0.1;
      }

      currentY += 0.3;

      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Generated on ${formatDate(new Date().toISOString())}`, margin + 0.2, currentY);
      pdf.text('Building Department Seal', pageWidth - margin - 0.2, currentY, { align: 'right' });

      // Download the PDF
      const filename = `Permit-Certificate-${permit.permit_number}.pdf`;
      pdf.save(filename);
      
      toast.dismiss();
      toast.success('PDF certificate downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF certificate. Please try again.');
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
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
              </Button>
              
              <Button
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Certificate
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