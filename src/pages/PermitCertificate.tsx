import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
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
  
  const { data: permit, isLoading, error } = usePermit(permitId!);
  
  const handlePrint = () => {
    window.print();
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
            
            <Button
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Permit
            </Button>
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