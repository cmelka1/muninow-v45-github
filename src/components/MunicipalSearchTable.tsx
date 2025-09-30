import React from 'react';
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
import { ChevronLeft, ChevronRight, FileText, Building, DollarSign, Settings } from 'lucide-react';
import { MunicipalApplication } from '@/hooks/useMunicipalSearch';

interface MunicipalSearchTableProps {
  data?: MunicipalApplication[];
  isLoading: boolean;
  error: any;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const MunicipalSearchTable: React.FC<MunicipalSearchTableProps> = ({
  data = [],
  isLoading,
  error,
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}) => {
  const navigate = useNavigate();
  const totalPages = Math.ceil(totalCount / pageSize);

  const getServiceTypeIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'permit':
        return <Building className="h-4 w-4" />;
      case 'license':
        return <FileText className="h-4 w-4" />;
      case 'tax':
        return <DollarSign className="h-4 w-4" />;
      case 'service':
        return <Settings className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getServiceTypeLabel = (serviceType: string) => {
    switch (serviceType) {
      case 'permit':
        return 'Building Permit';
      case 'license':
        return 'Business License';
      case 'tax':
        return 'Tax';
      case 'service':
        return 'Service';
      default:
        return 'Unknown';
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case 'draft':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'submitted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case 'under_review':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Under Review</Badge>;
      case 'information_requested':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Info Requested</Badge>;
      case 'resubmitted':
        return <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">Resubmitted</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'denied':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Denied</Badge>;
      case 'issued':
        return <Badge variant="secondary" className="bg-blue-600 text-white">Issued</Badge>;
      case 'paid':
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Paid</Badge>;
      case 'withdrawn':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Withdrawn</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Expired</Badge>;
      default:
        return <Badge variant="outline">{status.replace('_', ' ').toUpperCase()}</Badge>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const normalizedStatus = paymentStatus.toLowerCase();
    
    switch (normalizedStatus) {
      case 'paid':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Paid</Badge>;
      case 'unpaid':
      default:
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Unpaid</Badge>;
    }
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const handleRowClick = (application: MunicipalApplication) => {
    navigate(application.detailPath);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    onPageSizeChange(Number(newPageSize));
  };

  const handlePreviousPage = () => {
    onPageChange(Math.max(currentPage - 1, 1));
  };

  const handleNextPage = () => {
    onPageChange(Math.min(currentPage + 1, totalPages));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(pageSize)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <CardTitle>Search Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading search results. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No applications found matching your search criteria. Try adjusting your filters or search terms.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Results ({totalCount})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>User/Business</TableHead>
                <TableHead className="text-center">Service Type</TableHead>
                <TableHead className="hidden md:table-cell text-center">Category</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((application) => (
                <TableRow 
                  key={application.id} 
                  className="h-12 cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleRowClick(application)}
                >
                  <TableCell className="hidden sm:table-cell py-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(application.dateSubmitted)}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div>
                      <div className="font-medium truncate max-w-[180px]" title={application.businessName || application.userName}>
                        {application.businessName || application.userName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]" title={application.userEmail}>
                        {application.userEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <span className="font-medium">
                      {getServiceTypeLabel(application.serviceType)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2 text-center">
                    <span className="truncate mx-auto block max-w-[150px]" title={application.serviceName}>
                      {application.serviceName}
                    </span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    {getStatusBadge(application.status)}
                  </TableCell>
                  <TableCell className="text-center py-2">
                    {getPaymentStatusBadge(application.paymentStatus)}
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
      </CardContent>
    </Card>
  );
};

export default MunicipalSearchTable;
