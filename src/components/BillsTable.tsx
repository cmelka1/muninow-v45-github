import React, { useState } from 'react';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMunicipalBills } from '@/hooks/useMunicipalBills';

interface BillFilters {
  vendor?: string;
  category?: string;
  paymentStatus?: string;
  dueDateRange?: string;
  amountRange?: string;
}

interface BillsTableProps {
  filters?: BillFilters;
}

const BillsTable: React.FC<BillsTableProps> = ({ filters = {} }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  
  const { data: billsData, isLoading, error } = useMunicipalBills({ 
    page: currentPage, 
    pageSize,
    filters
  });

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const bills = billsData?.data || [];
  const totalCount = billsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unpaid':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Unpaid</Badge>;
      case 'overdue':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Overdue</Badge>;
      case 'delinquent':
        return <Badge variant="destructive">Delinquent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Bills</CardTitle>
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
        <CardHeader>
          <CardTitle>Outstanding Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading bills. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  if (!bills || bills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No outstanding bills found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding Bills</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[120px] text-center">Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id} className="h-12">
                  <TableCell className="hidden sm:table-cell py-2">
                    <span className="truncate">{formatDate(bill.due_date)}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="truncate block max-w-[200px]" title={bill.vendor}>
                      {bill.vendor}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <span className="truncate block max-w-[150px]" title={bill.category}>
                      {bill.category}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-2">
                    {getStatusBadge(bill.payment_status || 'unpaid')}
                  </TableCell>
                  <TableCell className="text-right font-medium py-2">
                    {formatAmount(Number(bill.amount_due))}
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <Button size="sm" className="w-full h-8">
                      Pay
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls */}
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
              {currentPage}
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
      </CardContent>
    </Card>
  );
};

export default BillsTable;