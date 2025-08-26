import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Building, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusinessLicense } from '@/hooks/useBusinessLicense';
import { useCustomerById } from '@/hooks/useCustomerById';
import { format } from 'date-fns';
import { formatEINForDisplay } from '@/lib/formatters';

const BusinessLicenseCertificate = () => {
  const { licenseId } = useParams<{ licenseId: string }>();
  const navigate = useNavigate();
  const { data: license, isLoading, error } = useBusinessLicense(licenseId!);
  const { customer: municipality, isLoading: municipalityLoading } = useCustomerById(license?.customer_id);

  const handleBack = () => {
    navigate(`/business-license/${licenseId}`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || municipalityLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 print:hidden">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to License
            </Button>
          </div>
          <Card>
            <CardContent className="p-8">
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !license) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 print:hidden">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to License
            </Button>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">License not found or not accessible.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Only show certificate for issued licenses that are paid
  if (license.application_status !== 'issued' || license.payment_status !== 'paid') {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 print:hidden">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to License
            </Button>
          </div>
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Certificate Not Available</h3>
              <p className="text-muted-foreground">
                The business license certificate is only available for issued and paid licenses.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Current status: {license.application_status} | Payment: {license.payment_status}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation and Print Button - Hidden when printing */}
      <div className="print:hidden p-6 bg-background border-b">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to License
          </Button>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Certificate
          </Button>
        </div>
      </div>

      {/* Certificate Content - Visible on screen and print */}
      <div className="print:p-0 print:m-0 print:bg-white print:shadow-none">
        <div className="max-w-4xl mx-auto print:max-w-none print:mx-0 print:w-full print:h-full">
          {/* Certificate Layout - Horizontal/Landscape Optimized */}
          <div className="bg-white print:bg-white print:h-screen print:w-full print:flex print:flex-col print:justify-center print:items-center print:p-8 p-8">
            <style dangerouslySetInnerHTML={{
              __html: `
                @media print {
                  * {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                  }
                  @page {
                    size: landscape;
                    margin: 0.5in;
                  }
                  body, html {
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  .print\\:hidden {
                    display: none !important;
                  }
                }
              `
            }} />
            <div className="print:landscape:max-h-full">
              {/* Certificate Border */}
              <div className="border-4 border-primary/20 p-8 relative">
                {/* Decorative Corner Elements */}
                <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-primary/30"></div>
                <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-primary/30"></div>
                <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-primary/30"></div>
                <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-primary/30"></div>

                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-primary mb-2">
                    BUSINESS LICENSE CERTIFICATE
                  </h1>
                  <div className="text-lg text-muted-foreground">
                    {municipality?.legal_entity_name || 'Municipality'}
                  </div>
                </div>

                {/* Main Content - Horizontal Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* License Information */}
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        License Details
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <span className="font-medium text-muted-foreground">License Number:</span>
                          <div className="text-lg font-bold text-primary">
                            #{license.license_number || license.id.slice(0, 8).toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">License Type:</span>
                          <div className="font-semibold">{license.business_type}</div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Issue Date:</span>
                          <div className="font-semibold">
                            {license.issued_at ? format(new Date(license.issued_at), 'MMMM d, yyyy') : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Business Information */}
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Business Information
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-muted-foreground">Business Name:</span>
                          <div className="font-bold text-lg">{license.business_legal_name}</div>
                        </div>
                        {license.doing_business_as && (
                          <div>
                            <span className="font-medium text-muted-foreground">DBA:</span>
                            <div className="font-semibold">{license.doing_business_as}</div>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-muted-foreground">Business Address:</span>
                          <div className="font-semibold">
                            {license.business_street_address}
                            {license.business_apt_number && `, ${license.business_apt_number}`}
                            <br />
                            {license.business_city}, {license.business_state} {license.business_zip_code}
                          </div>
                        </div>
                        {license.federal_ein && (
                          <div>
                            <span className="font-medium text-muted-foreground">Federal EIN:</span>
                            <div className="font-semibold">{formatEINForDisplay(license.federal_ein)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Owner Information */}
                    <div className="bg-muted/20 p-4 rounded-lg">
                      <h3 className="font-semibold text-lg mb-3">Owner Information</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-muted-foreground">Owner Name:</span>
                          <div className="font-semibold">
                            {license.owner_first_name} {license.owner_last_name}
                          </div>
                        </div>
                        {license.owner_title && (
                          <div>
                            <span className="font-medium text-muted-foreground">Title:</span>
                            <div className="font-semibold">{license.owner_title}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Legal Notice */}
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                      <h3 className="font-semibold text-lg mb-3 text-primary">Important Notice</h3>
                      <div className="text-sm space-y-2">
                        <p>
                          This certificate must be displayed in a conspicuous location on the licensed 
                          premises where it can be easily seen by the public.
                        </p>
                        <p>
                          This license is valid until revoked, suspended, or expired according to 
                          municipal regulations.
                        </p>
                        <p className="font-medium">
                          Failure to display this certificate may result in penalties.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer - Issuing Authority */}
                <div className="border-t pt-6 mt-8">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Issued by:</p>
                      <p className="font-semibold">{municipality?.legal_entity_name || 'Municipality'}</p>
                      <p className="text-sm text-muted-foreground">Business License Department</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Certificate issued on {format(new Date(), 'MMMM d, yyyy')}
                      </p>
                      {municipality?.entity_website && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Verify authenticity at: {municipality.entity_website}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessLicenseCertificate;