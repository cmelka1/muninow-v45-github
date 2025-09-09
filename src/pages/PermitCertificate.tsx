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

  // Parse HTML content and extract paragraphs for intelligent page breaks
  const parseHtmlToParagraphs = (htmlContent: string | null) => {
    if (!htmlContent || htmlContent.trim() === '' || htmlContent === 'None') {
      return [{ type: 'text', content: 'See application for details' }];
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const paragraphs: Array<{ type: string; content: string; items?: string[] }> = [];

    const processElement = (element: Element) => {
      const tagName = element.tagName.toLowerCase();
      
      if (tagName === 'p') {
        const text = element.textContent?.trim();
        if (text) {
          paragraphs.push({ type: 'paragraph', content: text });
        }
      } else if (tagName === 'ul' || tagName === 'ol') {
        const items = Array.from(element.querySelectorAll('li')).map(li => li.textContent?.trim() || '');
        if (items.length > 0) {
          paragraphs.push({ type: tagName, content: '', items });
        }
      } else if (tagName === 'div') {
        const text = element.textContent?.trim();
        if (text && !element.querySelector('p, ul, ol, li')) {
          paragraphs.push({ type: 'paragraph', content: text });
        } else {
          Array.from(element.children).forEach(processElement);
        }
      }
    };

    Array.from(tempDiv.children).forEach(processElement);
    
    // If no structured content found, treat as plain text
    if (paragraphs.length === 0) {
      const text = tempDiv.textContent?.trim();
      if (text) {
        paragraphs.push({ type: 'text', content: text });
      }
    }

    return paragraphs;
  };

  // Render individual sections for section-aware PDF generation
  const renderSection = (sectionType: string, content: React.ReactNode, className: string = '') => {
    return (
      <div className={`pdf-section-${sectionType} ${className}`} style={{ width: '816px', padding: '48px' }}>
        {content}
      </div>
    );
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
      const contentHeight = pageHeight - (margin * 2);

      let currentY = 0;
      let isFirstPage = true;

      const addSectionToPDF = async (sectionElement: HTMLElement) => {
        const canvas = await html2canvas(sectionElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 816,
        });

        const imgData = canvas.toDataURL('image/png');
        const sectionHeight = (canvas.height * contentWidth) / canvas.width;

        // Check if section fits on current page
        if (currentY + sectionHeight > contentHeight && !isFirstPage) {
          pdf.addPage();
          currentY = 0;
        }

        // If section is too tall for a single page, split it
        if (sectionHeight > contentHeight) {
          const totalPages = Math.ceil(sectionHeight / contentHeight);
          
          for (let i = 0; i < totalPages; i++) {
            if (i > 0 || (!isFirstPage && currentY > 0)) {
              pdf.addPage();
              currentY = 0;
            }

            const sourceY = (i * contentHeight * canvas.width) / contentWidth;
            const sourceHeight = Math.min(
              (contentHeight * canvas.width) / contentWidth,
              canvas.height - sourceY
            );

            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = sourceHeight;

            const pageCtx = pageCanvas.getContext('2d');
            if (pageCtx) {
              pageCtx.drawImage(
                canvas,
                0, sourceY, canvas.width, sourceHeight,
                0, 0, canvas.width, sourceHeight
              );

              const pageImgData = pageCanvas.toDataURL('image/png');
              const pageImgHeight = (sourceHeight * contentWidth) / canvas.width;
              pdf.addImage(pageImgData, 'PNG', margin, margin + currentY, contentWidth, pageImgHeight);
              
              if (i < totalPages - 1) {
                currentY = 0;
                isFirstPage = false;
              } else {
                currentY += pageImgHeight;
              }
            }
          }
        } else {
          pdf.addImage(imgData, 'PNG', margin, margin + currentY, contentWidth, sectionHeight);
          currentY += sectionHeight;
        }
        
        isFirstPage = false;
      };

      // Create sections
      const sections = [
        // Header section
        renderSection('header',
          <div className="bg-blue-600 text-white p-6 text-center border-b-4 border-blue-800 mb-6">
            <h1 className="text-3xl font-bold tracking-wide">BUILDING PERMIT CERTIFICATE</h1>
            <h2 className="text-xl font-semibold mt-2">{permit.merchant_name}</h2>
          </div>
        ),

        // Permit info section
        renderSection('permit-info',
          <div className="text-center border-b-2 border-gray-200 pb-6 mb-6">
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
        ),

        // Property details section
        renderSection('property-details',
          <div className="space-y-4 mb-6">
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
        )
      ];

      // Add scope of work as separate paragraphs for better page breaks
      const scopeParagraphs = parseHtmlToParagraphs(permit.scope_of_work);
      
      // Scope of work header
      sections.push(
        renderSection('scope-header',
          <div className="border-t-2 border-gray-200 pt-6 mb-4">
            <p className="font-medium text-blue-600 text-lg">SCOPE OF WORK</p>
          </div>
        )
      );

      // Individual scope paragraphs
      scopeParagraphs.forEach((paragraph, index) => {
        let content;
        if (paragraph.type === 'ul') {
          content = (
            <div className="mb-4">
              <ul className="list-disc pl-6 space-y-2">
                {paragraph.items?.map((item, i) => (
                  <li key={i} className="text-base leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
          );
        } else if (paragraph.type === 'ol') {
          content = (
            <div className="mb-4">
              <ol className="list-decimal pl-6 space-y-2">
                {paragraph.items?.map((item, i) => (
                  <li key={i} className="text-base leading-relaxed">{item}</li>
                ))}
              </ol>
            </div>
          );
        } else {
          content = (
            <div className="mb-4">
              <p className="text-base leading-relaxed">{paragraph.content}</p>
            </div>
          );
        }
        
        sections.push(renderSection(`scope-paragraph-${index}`, content));
      });

      // Legal notice section
      sections.push(
        renderSection('legal-notice',
          <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded mt-6 mb-6">
            <h4 className="font-bold text-center text-base mb-3">IMPORTANT NOTICE</h4>
            <div className="space-y-2 text-sm">
              <p><strong>• DISPLAY REQUIREMENT:</strong> This permit must be displayed in a conspicuous location on or near the job site where it can be easily seen by inspectors and officials.</p>
              <p><strong>• INSPECTION REQUIRED:</strong> Work performed under this permit may require inspections. Contact the issuing authority before beginning work to schedule required inspections.</p>
              <p><strong>• VALIDITY:</strong> This permit is valid only for the work described in the approved application. Any changes or additional work may require a separate permit.</p>
              <p><strong>• COMPLIANCE:</strong> All work must comply with applicable building codes, zoning ordinances, and other regulations in effect at the time of permit issuance.</p>
            </div>
          </div>
        )
      );

      // Footer section
      sections.push(
        renderSection('footer',
          <div className="border-t-2 border-gray-200 pt-4">
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
        )
      );

      // Render each section to PDF
      for (const section of sections) {
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        document.body.appendChild(tempContainer);

        const root = document.createElement('div');
        tempContainer.appendChild(root);
        
        const { createRoot } = await import('react-dom/client');
        const reactRoot = createRoot(root);
        
        await new Promise<void>((resolve) => {
          reactRoot.render(section);
          setTimeout(resolve, 300);
        });

        await addSectionToPDF(root);

        reactRoot.unmount();
        document.body.removeChild(tempContainer);
      }

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