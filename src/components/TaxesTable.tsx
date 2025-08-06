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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { TaxFilters } from './TaxesFilter';

interface Tax {
  tax_id: string;
  tax_number: string;
  tax_type: string;
  status: string;
  taxpayer_name: string;
  tax_year: string;
  amount_due_cents: number;
  due_date: string;
  created_at: string;
}

interface TaxesTableProps {
  filters?: TaxFilters;
  onViewClick?: (taxId: string) => void;
}

const TaxesTable: React.FC<TaxesTableProps> = ({ filters = {}, onViewClick }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isPayTaxDialogOpen, setIsPayTaxDialogOpen] = useState(false);

  // Mock data for now - replace with actual hook when ready
  const mockTaxes: Tax[] = [];
  const isLoading = false;
  const error = null;
  const totalCount = 0;
  const totalPages = 0;

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unpaid':
        return <Badge variant="destructive">Unpaid</Badge>;
      case 'paid':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Paid</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Overdue</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Partial</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'refunded':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTaxTypeLabel = (type: string) => {
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

  const handleRowClick = (taxId: string) => {
    if (onViewClick) {
      onViewClick(taxId);
    } else {
      navigate(`/tax/${taxId}`);
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Taxes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading taxes: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Taxes</CardTitle>
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

  if (!mockTaxes || mockTaxes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Taxes ({totalCount})</CardTitle>
            <Button 
              onClick={() => setIsPayTaxDialogOpen(true)}
              className="flex items-center space-x-2"
              disabled
            >
              <DollarSign className="w-4 h-4" />
              <span>Pay Tax</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No taxes found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Taxes ({totalCount})</CardTitle>
          <Button 
            onClick={() => setIsPayTaxDialogOpen(true)}
            className="flex items-center space-x-2"
            disabled
          >
            <DollarSign className="w-4 h-4" />
            <span>Pay Tax</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Tax ID</TableHead>
                <TableHead>Taxpayer</TableHead>
                <TableHead className="hidden lg:table-cell text-center">Type</TableHead>
                <TableHead className="hidden xl:table-cell text-center">Tax Year</TableHead>
                <TableHead className="text-center">Amount Due</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTaxes.map((tax) => (
                <TableRow 
                  key={tax.tax_id} 
                  className="h-12 cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleRowClick(tax.tax_id)}
                >
                  <TableCell className="hidden sm:table-cell py-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(tax.created_at)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <span className="truncate font-mono text-sm">{tax.tax_number}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="truncate block max-w-[150px] font-medium" title={tax.taxpayer_name}>
                      {tax.taxpayer_name}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-2 text-center">
                    <span className="truncate block max-w-[100px] mx-auto" title={getTaxTypeLabel(tax.tax_type)}>
                      {getTaxTypeLabel(tax.tax_type)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell py-2 text-center">
                    <span className="text-sm font-medium">
                      {tax.tax_year}
                    </span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <span className="text-sm font-medium">
                      {formatAmount(Number(tax.amount_due_cents) / 100)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    {getStatusBadge(tax.status)}
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
  );
};

export default TaxesTable;