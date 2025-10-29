import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useMunicipalRecentApplications } from '@/hooks/useMunicipalRecentApplications';
import { formatCurrency, formatDate, formatTaxType } from '@/lib/formatters';
import { PermitStatusBadge } from '@/components/PermitStatusBadge';
import { BusinessLicenseStatusBadge } from '@/components/BusinessLicenseStatusBadge';
import { TaxSubmissionStatusBadge } from '@/components/TaxSubmissionStatusBadge';
import ServiceApplicationStatusBadge from '@/components/ServiceApplicationStatusBadge';
import { ServiceApplicationRenewalStatusBadge } from '@/components/ServiceApplicationRenewalStatusBadge';
import { Badge } from '@/components/ui/badge';

const PaymentStatusBadge = ({ status }: { status: string | null }) => {
  if (!status) {
    return <Badge variant="secondary" className="bg-gray-100 text-gray-800">N/A</Badge>;
  }
  
  const config = status === 'paid' 
    ? { className: 'bg-green-100 text-green-800', label: 'Paid' }
    : status === 'pending'
    ? { className: 'bg-yellow-100 text-yellow-800', label: 'Pending' }
    : { className: 'bg-red-100 text-red-800', label: 'Unpaid' };
    
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
};

export const MunicipalRecentApplicationsTables = () => {
  const navigate = useNavigate();
  const { permits, licenses, taxes, services, isLoading } = useMunicipalRecentApplications();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Building Permits */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Building Permits</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {permits.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent building permits</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                  <TableHead className="text-center">Date Submitted</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Payment Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Payment Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permits.map((permit) => (
                    <TableRow 
                      key={permit.id}
                      className="h-12 cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/municipal/permit/${permit.id}`)}
                    >
                      <TableCell className="py-2 text-center">
                        <span className="text-sm text-muted-foreground">{formatDate(permit.submitted_at)}</span>
                      </TableCell>
                      <TableCell className="py-2 font-medium">{permit.applicant_full_name}</TableCell>
                      <TableCell className="py-2">{permit.permit_type_name || 'Unknown'}</TableCell>
                      <TableCell className="py-2 text-center">{formatCurrency(permit.base_fee_cents)}</TableCell>
                      <TableCell className="py-2 text-center">
                        <PermitStatusBadge status={permit.application_status as any} />
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <PaymentStatusBadge status={permit.payment_status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Licenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Business Licenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {licenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent business licenses</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                  <TableHead className="text-center">Date Submitted</TableHead>
                    <TableHead>Name/Company</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Payment Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Payment Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenses.map((license) => (
                    <TableRow 
                      key={license.id}
                      className="h-12 cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/municipal/business-license/${license.id}`)}
                    >
                      <TableCell className="py-2 text-center">
                        <span className="text-sm text-muted-foreground">{formatDate(license.submitted_at)}</span>
                      </TableCell>
                      <TableCell className="py-2 font-medium">
                        {license.business_legal_name || `${license.owner_first_name} ${license.owner_last_name}`}
                      </TableCell>
                      <TableCell className="py-2">{formatTaxType(license.business_type)}</TableCell>
                      <TableCell className="py-2 text-center">{formatCurrency(license.base_amount_cents)}</TableCell>
                      <TableCell className="py-2 text-center">
                        <BusinessLicenseStatusBadge status={license.application_status} />
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <PaymentStatusBadge status={license.payment_status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Taxes */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Business Taxes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {taxes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent business taxes</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                  <TableHead className="text-center">Date Submitted</TableHead>
                    <TableHead>Name/Company</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Payment Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Payment Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxes.map((tax) => (
                    <TableRow 
                      key={tax.id}
                      className="h-12 cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/municipal/tax/${tax.id}`)}
                    >
                      <TableCell className="py-2 text-center">
                        <span className="text-sm text-muted-foreground">{formatDate(tax.submission_date)}</span>
                      </TableCell>
                      <TableCell className="py-2 font-medium">
                        {tax.payer_business_name || `${tax.first_name || ''} ${tax.last_name || ''}`.trim() || 'N/A'}
                      </TableCell>
                      <TableCell className="py-2">{formatTaxType(tax.tax_type)}</TableCell>
                      <TableCell className="py-2 text-center">{formatCurrency(tax.base_amount_cents)}</TableCell>
                      <TableCell className="py-2 text-center">
                        <TaxSubmissionStatusBadge status={tax.submission_status} />
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <PaymentStatusBadge status={tax.payment_status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Service Applications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {services.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent service applications</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                 <TableHeader className="bg-muted/50">
                   <TableRow>
                     <TableHead className="text-center">Date Submitted</TableHead>
                     <TableHead>Name/Company</TableHead>
                     <TableHead>Category</TableHead>
                     <TableHead className="text-center">Payment Amount</TableHead>
                     <TableHead className="text-center">Status</TableHead>
                     <TableHead className="text-center">Payment Status</TableHead>
                     <TableHead className="text-center">Expiration</TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow 
                      key={service.id}
                      className="h-12 cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/municipal/service-application/${service.id}`)}
                    >
                      <TableCell className="py-2 text-center">
                        <span className="text-sm text-muted-foreground">{formatDate(service.created_at)}</span>
                      </TableCell>
                      <TableCell className="py-2 font-medium">
                        {service.business_legal_name || service.applicant_name || 'N/A'}
                      </TableCell>
                      <TableCell className="py-2">{service.tile_name || service.service_name || 'Service Application'}</TableCell>
                      <TableCell className="py-2 text-center">{formatCurrency(service.base_amount_cents)}</TableCell>
                      <TableCell className="py-2 text-center">
                        <ServiceApplicationStatusBadge status={service.status} />
                      </TableCell>
                       <TableCell className="py-2 text-center">
                         <PaymentStatusBadge status={service.payment_status} />
                       </TableCell>
                       <TableCell className="py-2 text-center">
                         {service.expires_at && service.status === 'issued' && service.is_renewable ? (
                           <ServiceApplicationRenewalStatusBadge 
                             renewalStatus={service.renewal_status || 'active'} 
                             expiresAt={service.expires_at}
                           />
                         ) : (
                           <span className="text-sm text-muted-foreground">N/A</span>
                         )}
                       </TableCell>
                     </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
