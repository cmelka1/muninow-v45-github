import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, Calendar, MapPin, User, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermit } from '@/hooks/usePermit';
import { formatDate } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';

const PermitCertificate = () => {
  const { permitId } = useParams<{ permitId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const { data: permit, isLoading, error } = usePermit(permitId!);
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // For now, use the browser print to PDF functionality
    // Could be enhanced with a proper PDF generation library later
    window.print();
    toast({
      title: "Print Dialog Opened",
      description: "Use your browser's print dialog to save as PDF.",
    });
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
        <div className="flex items-center justify-center gap-3 mb-4">
          <Building className="h-8 w-8" />
          <h1 className="text-3xl font-bold tracking-wide">BUILDING PERMIT CERTIFICATE</h1>
        </div>
        <h2 className="text-xl font-semibold">{permit.merchant_name}</h2>
      </div>

      {/* Certificate Body */}
      <div className="p-8 space-y-8">
        {/* Permit Information */}
        <div className="text-center border-b-2 border-gray-200 pb-6">
          <h3 className="text-2xl font-bold text-primary mb-2">PERMIT AUTHORIZED</h3>
          <div className="grid grid-cols-2 gap-8 mt-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">PERMIT NUMBER</p>
              <p className="text-2xl font-mono font-bold">{permit.permit_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">PERMIT TYPE</p>
              <p className="text-xl font-semibold">{permit.permit_type}</p>
            </div>
          </div>
        </div>

        {/* Property and Work Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="font-medium text-primary">PROPERTY ADDRESS</p>
                <p className="text-lg">{permit.property_address}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="font-medium text-primary">SCOPE OF WORK</p>
                <p className="text-base">{permit.scope_of_work || 'See application for details'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="font-medium text-primary">PERMIT HOLDER</p>
                <p className="text-lg">{permit.applicant_full_name}</p>
                <p className="text-sm text-muted-foreground">{permit.applicant_email}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="font-medium text-primary">DATE ISSUED</p>
                <p className="text-lg">{formatDate(permit.issued_at)}</p>
              </div>
            </div>
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
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Save as PDF
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
            @media print {
              body * { visibility: hidden; }
              .print-certificate, .print-certificate * { visibility: visible; }
              .print-certificate { position: absolute; left: 0; top: 0; width: 100%; }
              @page { margin: 0.5in; size: letter; }
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