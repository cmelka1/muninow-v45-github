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
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { PermitFilters } from './PermitsFilter';

interface Permit {
  permit_id: string;
  application_date: string;
  permit_type: string;
  status: string;
  applicant_name: string;
  address: string;
  fee_amount_cents: number;
  department: string;
}

interface PermitsTableProps {
  filters?: PermitFilters;
  onViewClick?: (permitId: string) => void;
}

// Mock data for permits
const mockPermits: Permit[] = [
  {
    permit_id: '1',
    application_date: '2024-01-15T00:00:00Z',
    permit_type: 'building',
    status: 'approved',
    applicant_name: 'John Smith',
    address: '123 Main St',
    fee_amount_cents: 25000,
    department: 'building'
  },
  {
    permit_id: '2',
    application_date: '2024-01-20T00:00:00Z',
    permit_type: 'electrical',
    status: 'under_review',
    applicant_name: 'Jane Doe',
    address: '456 Oak Ave',
    fee_amount_cents: 15000,
    department: 'building'
  },
  {
    permit_id: '3',
    application_date: '2024-01-25T00:00:00Z',
    permit_type: 'plumbing',
    status: 'pending',
    applicant_name: 'Bob Wilson',
    address: '789 Pine St',
    fee_amount_cents: 12000,
    department: 'building'
  },
  {
    permit_id: '4',
    application_date: '2024-02-01T00:00:00Z',
    permit_type: 'fire',
    status: 'approved',
    applicant_name: 'Sarah Johnson',
    address: '321 Elm St',
    fee_amount_cents: 18000,
    department: 'fire'
  },
  {
    permit_id: '5',
    application_date: '2024-02-05T00:00:00Z',
    permit_type: 'business',
    status: 'rejected',
    applicant_name: 'Mike Brown',
    address: '654 Cedar Rd',
    fee_amount_cents: 30000,
    department: 'planning'
  }
];

const PermitsTable: React.FC<PermitsTableProps> = ({ filters = {}, onViewClick }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isLoading] = useState(false); // Mock loading state

  // Filter mock data based on filters
  const filteredPermits = mockPermits.filter(permit => {
    if (filters.permitType && permit.permit_type !== filters.permitType) return false;
    if (filters.status && permit.status !== filters.status) return false;
    if (filters.department && permit.department !== filters.department) return false;
    if (filters.feeRange) {
      const fee = permit.fee_amount_cents / 100;
      switch (filters.feeRange) {
        case '0-100':
          if (fee > 100) return false;
          break;
        case '101-500':
          if (fee <= 100 || fee > 500) return false;
          break;
        case '501-1000':
          if (fee <= 500 || fee > 1000) return false;
          break;
        case '1000+':
          if (fee <= 1000) return false;
          break;
      }
    }
    return true;
  });

  // Paginate the filtered results
  const totalCount = filteredPermits.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const permits = filteredPermits.slice(startIndex, startIndex + pageSize);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'under_review':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPermitTypeLabel = (type: string) => {
    switch (type) {
      case 'building': return 'Building';
      case 'electrical': return 'Electrical';
      case 'plumbing': return 'Plumbing';
      case 'fire': return 'Fire Safety';
      case 'zoning': return 'Zoning';
      case 'business': return 'Business License';
      default: return type;
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
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleRowClick = (permitId: string) => {
    navigate(`/permit/${permitId}`);
  };

  const handleViewClick = (e: React.MouseEvent, permitId: string) => {
    e.stopPropagation(); // Prevent row click navigation
    onViewClick?.(permitId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permits</CardTitle>
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
          <CardTitle>Permits ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No permits found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permits ({totalCount})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="hidden sm:table-cell">Application Date</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead className="hidden md:table-cell text-center">Type</TableHead>
                <TableHead className="hidden lg:table-cell text-center">Status</TableHead>
                <TableHead className="text-center">Fee</TableHead>
                <TableHead className="w-[120px] text-center">View</TableHead>
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
                    <span className="truncate">{formatDate(permit.application_date)}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div>
                      <span className="truncate block max-w-[200px] font-medium" title={permit.applicant_name}>
                        {permit.applicant_name}
                      </span>
                      <span className="truncate block max-w-[200px] text-sm text-muted-foreground" title={permit.address}>
                        {permit.address}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2 text-center">
                    <span className="truncate block max-w-[100px] lg:max-w-[150px] xl:max-w-[200px] mx-auto" title={getPermitTypeLabel(permit.permit_type)}>
                      {getPermitTypeLabel(permit.permit_type)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-2 text-center">
                    {getStatusBadge(permit.status)}
                  </TableCell>
                  <TableCell className="text-center font-medium py-2">
                    {formatAmount(Number(permit.fee_amount_cents) / 100)}
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full h-8"
                      onClick={(e) => handleViewClick(e, permit.permit_id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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

export default PermitsTable;