import React, { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { BusinessLicenseFilters } from './BusinessLicenseFilter';
import { BusinessLicenseStatusBadge } from './BusinessLicenseStatusBadge';
import { NewBusinessLicenseDialog } from '@/components/NewBusinessLicenseDialog';
import { useBusinessLicenses } from '@/hooks/useBusinessLicenses';

interface BusinessLicenseTableProps {
  filters?: BusinessLicenseFilters;
  onViewClick?: (licenseId: string) => void;
}

const BusinessLicenseTable: React.FC<BusinessLicenseTableProps> = ({ filters = {}, onViewClick }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isNewLicenseDialogOpen, setIsNewLicenseDialogOpen] = useState(false);

  // Fetch business licenses using the hook
  const { data, isLoading, error } = useBusinessLicenses({
    filters,
    page: currentPage,
    pageSize,
  });

  const licenses = data?.licenses || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 0;

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);


  const getLicenseTypeLabel = (type: string) => {
    // Capitalize first letter and handle common types
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleRowClick = (licenseId: string) => {
    if (onViewClick) {
      onViewClick(licenseId);
    } else {
      navigate(`/business-license/${licenseId}`);
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Licenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading business licenses: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

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

  if (!licenses || licenses.length === 0) {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Business Licenses ({totalCount})</CardTitle>
              <Button 
                onClick={() => setIsNewLicenseDialogOpen(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add New License</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No business licenses found.</p>
          </CardContent>
        </Card>

        <NewBusinessLicenseDialog
          open={isNewLicenseDialogOpen}
          onOpenChange={setIsNewLicenseDialogOpen}
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Business Licenses ({totalCount})</CardTitle>
            <Button 
              onClick={() => setIsNewLicenseDialogOpen(true)}
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
                <TableHead className="hidden sm:table-cell">Date Applied</TableHead>
                <TableHead className="hidden md:table-cell">License #</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead className="hidden lg:table-cell">Address</TableHead>
                <TableHead className="hidden xl:table-cell text-center">Type</TableHead>
                <TableHead className="hidden 2xl:table-cell text-center">Fee</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.map((license) => (
                <TableRow 
                  key={license.id} 
                  className="h-12 cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleRowClick(license.id)}
                >
                  <TableCell className="hidden sm:table-cell py-2">
                    <span className="text-sm text-muted-foreground">
                      {license.submitted_at ? formatDate(license.submitted_at) : formatDate(license.created_at)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <span className="truncate font-mono text-sm">{license.license_number || 'Pending'}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="truncate block max-w-[150px] font-medium" title={license.business_legal_name}>
                      {license.business_legal_name}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-2">
                    <span className="truncate block max-w-[150px] text-sm" title={license.business_street_address}>
                      {license.business_street_address}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell py-2 text-center">
                    <span className="truncate block max-w-[100px] mx-auto" title={getLicenseTypeLabel(license.business_type)}>
                      {getLicenseTypeLabel(license.business_type)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden 2xl:table-cell py-2 text-center">
                    <span className="text-sm font-medium">
                      {formatAmount(license.base_fee_cents / 100)}
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
        {totalPages > 1 && (
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
                {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
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
      open={isNewLicenseDialogOpen}
      onOpenChange={setIsNewLicenseDialogOpen}
    />
    </>
  );
};

export default BusinessLicenseTable;