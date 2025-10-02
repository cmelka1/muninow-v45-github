import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useMunicipalRecentApplications } from '@/hooks/useMunicipalRecentApplications';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { PermitStatusBadge } from '@/components/PermitStatusBadge';
import { BusinessLicenseStatusBadge } from '@/components/BusinessLicenseStatusBadge';
import { TaxSubmissionStatusBadge } from '@/components/TaxSubmissionStatusBadge';
import ServiceApplicationStatusBadge from '@/components/ServiceApplicationStatusBadge';
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
        <CardContent>
          {permits.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent building permits</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Submitted</TableHead>
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
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/municipal/permits/${permit.id}`)}
                  >
                    <TableCell>{formatDate(permit.submitted_at)}</TableCell>
                    <TableCell className="font-medium">{permit.applicant_full_name}</TableCell>
                    <TableCell>{permit.permit_type}</TableCell>
                    <TableCell className="text-center">{formatCurrency(permit.base_fee_cents)}</TableCell>
                    <TableCell className="text-center">
                      <PermitStatusBadge status={permit.application_status as any} />
                    </TableCell>
                    <TableCell className="text-center">
                      <PaymentStatusBadge status={permit.payment_status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Business Licenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Business Licenses</CardTitle>
        </CardHeader>
        <CardContent>
          {licenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent business licenses</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Submitted</TableHead>
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
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/municipal/business-licenses/${license.id}`)}
                  >
                    <TableCell>{formatDate(license.submitted_at)}</TableCell>
                    <TableCell className="font-medium">
                      {license.business_legal_name || `${license.owner_first_name} ${license.owner_last_name}`}
                    </TableCell>
                    <TableCell>{license.business_type}</TableCell>
                    <TableCell className="text-center">{formatCurrency(license.base_fee_cents)}</TableCell>
                    <TableCell className="text-center">
                      <BusinessLicenseStatusBadge status={license.application_status} />
                    </TableCell>
                    <TableCell className="text-center">
                      <PaymentStatusBadge status={license.payment_status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Business Taxes */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Business Taxes</CardTitle>
        </CardHeader>
        <CardContent>
          {taxes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent business taxes</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Submitted</TableHead>
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
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/municipal/taxes/${tax.id}`)}
                  >
                    <TableCell>{formatDate(tax.submission_date)}</TableCell>
                    <TableCell className="font-medium">
                      {tax.payer_business_name || `${tax.first_name || ''} ${tax.last_name || ''}`.trim() || 'N/A'}
                    </TableCell>
                    <TableCell>{tax.tax_type}</TableCell>
                    <TableCell className="text-center">{formatCurrency(tax.amount_cents)}</TableCell>
                    <TableCell className="text-center">
                      <TaxSubmissionStatusBadge status={tax.submission_status} />
                    </TableCell>
                    <TableCell className="text-center">
                      <PaymentStatusBadge status={tax.payment_status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Service Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Service Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent service applications</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead>Name/Company</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Payment Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Payment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow 
                    key={service.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/municipal/other-services/${service.id}`)}
                  >
                    <TableCell>{formatDate(service.submitted_at)}</TableCell>
                    <TableCell className="font-medium">
                      {service.business_legal_name || service.applicant_name || 'N/A'}
                    </TableCell>
                    <TableCell>{service.service_name || 'Service Application'}</TableCell>
                    <TableCell className="text-center">{formatCurrency(service.amount_cents)}</TableCell>
                    <TableCell className="text-center">
                      <ServiceApplicationStatusBadge status={service.status} />
                    </TableCell>
                    <TableCell className="text-center">
                      <PaymentStatusBadge status={service.payment_status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
