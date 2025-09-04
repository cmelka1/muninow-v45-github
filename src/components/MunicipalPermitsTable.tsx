import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PermitFilters } from './PermitsFilter';
import { NewPermitApplicationDialog } from '@/components/NewPermitApplicationDialog';
import { useMunicipalPermits } from '@/hooks/useMunicipalPermits';
import { useQueryPerformance } from '@/hooks/useQueryPerformance';
import { PermitStatusBadge } from '@/components/PermitStatusBadge';

interface MunicipalPermitsTableProps {
  filters?: PermitFilters;
  onViewClick?: (permitId: string) => void;
}

const MunicipalPermitsTable: React.FC<MunicipalPermitsTableProps> = ({ filters = {}, onViewClick }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isNewPermitDialogOpen, setIsNewPermitDialogOpen] = useState(false);
  const performance = useQueryPerformance();
  const componentMountTime = useRef<number>(window.performance.now());
  const renderCount = useRef<number>(0);

  // Fetch municipal permits from Supabase
  const { data, isLoading, error } = useMunicipalPermits({
    filters,
    page: currentPage,
    pageSize
  });

  const permits = data?.permits || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 0;

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Performance monitoring
  useEffect(() => {
    renderCount.current += 1;
    const renderTime = window.performance.now() - componentMountTime.current;
    
    performance.log('MunicipalPermitsTable render', {
      renderCount: renderCount.current,
      renderTime: `${renderTime.toFixed(2)}ms`,
      filters,
      currentPage,
      pageSize,
      permitsCount: permits.length,
      isLoading,
      hasError: !!error
    });

    // Track component lifecycle
    if (renderCount.current === 1) {
      performance.log('MunicipalPermitsTable first render', {
        mountTime: `${renderTime.toFixed(2)}ms`
      });
    }

    // Warn about excessive re-renders
    if (renderCount.current > 10) {
      performance.warn('MunicipalPermitsTable excessive re-renders detected', {
        renderCount: renderCount.current,
        filters,
        currentPage,
        pageSize
      });
    }
  });

  // Track filter changes
  useEffect(() => {
    performance.log('Filters changed', {
      newFilters: filters,
      resetToPage: 1
    });
  }, [filters, performance]);


  const getPermitTypeLabel = (type: string) => {
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

  const handleRowClick = (permitId: string) => {
    if (onViewClick) {
      onViewClick(permitId);
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Building Permits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading permits: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Building Permits</CardTitle>
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

  if (!permits || permits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Building Permits ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No permits found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Building Permits ({totalCount})</CardTitle>
            <Button 
              onClick={() => setIsNewPermitDialogOpen(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Permit</span>
            </Button>
          </div>
        </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Permit #</TableHead>
                <TableHead className="hidden lg:table-cell">Property Address</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead className="hidden xl:table-cell text-center">Type</TableHead>
                <TableHead className="hidden 2xl:table-cell text-center">Construction Value</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permits.map((permit) => (
                <TableRow 
                  key={permit.permit_id} 
                  className="h-12 cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleRowClick(permit.permit_id)}
                >
                  <TableCell className="hidden sm:table-cell py-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(permit.created_at)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <span className="truncate font-mono text-sm">{permit.permit_number}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-2">
                    <span className="truncate block max-w-[150px] text-sm" title={permit.property_address}>
                      {permit.property_address}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="truncate block max-w-[150px] font-medium" title={permit.applicant_full_name}>
                      {permit.applicant_full_name}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell py-2 text-center">
                    <span className="truncate block max-w-[100px] mx-auto" title={getPermitTypeLabel(permit.permit_type)}>
                      {getPermitTypeLabel(permit.permit_type)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden 2xl:table-cell py-2 text-center">
                    <span className="text-sm font-medium">
                      {formatAmount(Number(permit.estimated_construction_value_cents) / 100)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <PermitStatusBadge status={permit.application_status as any} />
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

    <NewPermitApplicationDialog
      open={isNewPermitDialogOpen}
      onOpenChange={setIsNewPermitDialogOpen}
    />
    </>
  );
};

export default MunicipalPermitsTable;