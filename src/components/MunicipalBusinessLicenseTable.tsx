import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMunicipalBusinessLicenses, type MunicipalBusinessLicense } from '@/hooks/useMunicipalBusinessLicenses';
import { BusinessLicenseStatusBadge } from '@/components/BusinessLicenseStatusBadge';
import { NewBusinessLicenseDialog } from '@/components/NewBusinessLicenseDialog';
import type { BusinessLicenseFilters } from '@/components/BusinessLicenseFilter';

interface MunicipalBusinessLicenseTableProps {
  filters?: BusinessLicenseFilters;
  onViewClick?: (licenseId: string) => void;
}

export const MunicipalBusinessLicenseTable: React.FC<MunicipalBusinessLicenseTableProps> = ({
  filters,
  onViewClick
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showNewLicenseDialog, setShowNewLicenseDialog] = useState(false);

  const { data, isLoading, error } = useMunicipalBusinessLicenses({
    filters,
    page: currentPage,
    pageSize
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const formatAmount = (cents: number | null) => {
    if (!cents) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, data?.totalPages || 1));
  };

  const handleRowClick = (license: MunicipalBusinessLicense) => {
    if (onViewClick) {
      onViewClick(license.id);
    } else {
      window.location.href = `/municipal/business-license/${license.id}`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Licenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(pageSize)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            Error loading business licenses: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.licenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Licenses ({data?.totalCount || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No business licenses found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Business Licenses ({data.totalCount})</CardTitle>
            <Button 
              onClick={() => setShowNewLicenseDialog(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New License</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">License #</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Owner Name</TableHead>
                  <TableHead className="hidden xl:table-cell text-center">Type</TableHead>
                  <TableHead className="hidden 2xl:table-cell text-center">Fee</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.licenses.map((license) => (
                  <TableRow 
                    key={license.id}
                    className="h-12 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(license)}
                  >
                    <TableCell className="hidden sm:table-cell py-2">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(license.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2">
                      <span className="truncate font-mono text-sm">
                        {license.license_number || 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="truncate block max-w-[150px] font-medium" title={license.business_legal_name}>
                        {license.business_legal_name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-2">
                      <span className="truncate block max-w-[150px]" title={`${license.owner_first_name} ${license.owner_last_name}`}>
                        {license.owner_first_name} {license.owner_last_name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell py-2 text-center">
                      <span className="truncate block max-w-[100px] mx-auto" title={license.business_type}>
                        {license.business_type}
                      </span>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell py-2 text-center">
                      <span className="text-sm font-medium">
                        {formatAmount(license.total_amount_cents)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-2">
                      <BusinessLicenseStatusBadge status={license.application_status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Show:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="h-8 px-3"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <span className="text-sm font-medium px-2">
                  {currentPage} of {data.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === data.totalPages}
                  className="h-8 px-3"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <NewBusinessLicenseDialog
        open={showNewLicenseDialog}
        onOpenChange={setShowNewLicenseDialog}
      />
    </>
  );
};