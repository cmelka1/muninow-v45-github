import React, { useState } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: 'Paid', variant: 'default' as const },
      pending: { label: 'Pending', variant: 'secondary' as const },
      failed: { label: 'Failed', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading tax submissions</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          {headerAction}
        </div>
      </div>
      <CardContent className="p-6 pt-0">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: pageSize }).map((_, index) => (
              <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.data?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No tax submissions found
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submission Date</TableHead>
                  <TableHead>Tax Type</TableHead>
                  <TableHead>Tax Period</TableHead>
                  <TableHead>Tax Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((submission) => (
                  <TableRow key={submission.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {formatDate(submission.submission_date)}
                    </TableCell>
                    <TableCell>{formatTaxType(submission.tax_type)}</TableCell>
                    <TableCell>
                      {formatPeriod(submission.tax_period_start, submission.tax_period_end)}
                    </TableCell>
                    <TableCell>{submission.tax_year}</TableCell>
                    <TableCell>{getStatusBadge(submission.payment_status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(submission.total_amount_cents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-6">
                <span className="text-sm text-muted-foreground">
                  {startIndex}-{endIndex} of {data.count}
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxSubmissionsTable;