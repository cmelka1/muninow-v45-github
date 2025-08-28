import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useMunicipalTaxSubmissions } from '@/hooks/useMunicipalTaxSubmissions';
import { TaxSubmissionFilters } from '@/components/TaxSubmissionsFilter';

interface MunicipalTaxSubmissionsTableProps {
  filters?: TaxSubmissionFilters;
  title?: string;
  headerAction?: React.ReactNode;
}

const MunicipalTaxSubmissionsTable: React.FC<MunicipalTaxSubmissionsTableProps> = ({ 
  filters = {}, 
  title = "Municipal Tax Submissions",
  headerAction 
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, error } = useMunicipalTaxSubmissions({
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

  const handleViewDetails = (submissionId: string) => {
    navigate(`/municipal/tax/${submissionId}`);
  };

  const handleRowClick = (submissionId: string) => {
    handleViewDetails(submissionId);
  };

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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold">
          {title} ({data?.count || 0})
        </CardTitle>
        {headerAction}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: pageSize }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4 p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
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
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Submission Date</TableHead>
                  <TableHead>Taxpayer Name</TableHead>
                  <TableHead>Tax Type</TableHead>
                  <TableHead>Tax Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((submission) => (
                  <TableRow 
                    key={submission.id} 
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleRowClick(submission.id)}
                  >
                    <TableCell className="font-medium">
                      {formatDate(submission.submission_date)}
                    </TableCell>
                    <TableCell>
                      {submission.payer_business_name || `${submission.first_name} ${submission.last_name}`}
                    </TableCell>
                    <TableCell>{formatTaxType(submission.tax_type)}</TableCell>
                    <TableCell>
                      {formatPeriod(submission.tax_period_start, submission.tax_period_end)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(submission.total_amount_cents)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(submission.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between p-4 border-t">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Show</span>
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
                <span className="text-sm text-muted-foreground">entries</span>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                    className="h-8 px-3"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
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

export default MunicipalTaxSubmissionsTable;