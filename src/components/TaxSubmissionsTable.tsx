import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTaxSubmissions } from '@/hooks/useTaxSubmissions';
import { TaxSubmissionFilters } from './TaxSubmissionsFilter';

interface TaxSubmissionsTableProps {
  filters?: TaxSubmissionFilters;
  title?: string;
  headerAction?: React.ReactNode;
}

const TaxSubmissionsTable: React.FC<TaxSubmissionsTableProps> = ({ 
  filters = {}, 
  title = "Tax Submissions",
  headerAction 
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const { data, isLoading, error } = useTaxSubmissions({
    page: currentPage,
    pageSize,
    filters,
  });

  const formatTaxType = (taxType: string) => {
    const typeMap: Record<string, string> = {
      'food_beverage': 'Food & Beverage',
      'hotel_motel': 'Hotel & Motel',
      'amusement': 'Amusement'
    };
    return typeMap[taxType] || taxType;
  };

  const formatAmount = (amountCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amountCents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };


  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    if (data && currentPage * pageSize < data.count) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const totalPages = data ? Math.ceil(data.count / pageSize) : 0;
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, data?.count || 0);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading tax submissions</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
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

  if (!data?.data?.length) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{title} ({data?.count || 0})</CardTitle>
            {headerAction}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tax submissions found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{title} ({data?.count || 0})</CardTitle>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="hidden sm:table-cell">Submission Date</TableHead>
                <TableHead>Tax Type</TableHead>
                <TableHead className="hidden md:table-cell">Tax Period</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((submission) => (
                <TableRow 
                  key={submission.id} 
                  className="h-12 cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/tax/${submission.id}`)}
                >
                  <TableCell className="hidden sm:table-cell py-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(submission.submission_date)}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="font-medium">{formatTaxType(submission.tax_type)}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <span className="text-sm">
                      {formatPeriod(submission.tax_period_start, submission.tax_period_end)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium py-2">
                    {formatAmount(submission.total_amount_cents)}
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

export default TaxSubmissionsTable;