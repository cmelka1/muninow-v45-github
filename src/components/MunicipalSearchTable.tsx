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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchResult, MunicipalSearchFilters } from '@/hooks/useMunicipalSearch';

interface MunicipalSearchTableProps {
  data?: SearchResult[];
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

  const getAccountTypeBadge = (accountType: string) => {
    switch (accountType) {
      case 'business':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Business</Badge>;
      case 'resident':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Resident</Badge>;
      default:
        return <Badge variant="outline">{accountType}</Badge>;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatAddress = (user: SearchResult) => {
    const address = user.street_address || '';
    const apt = user.apt_number || '';
    const city = user.city || '';
    const state = user.state || '';
    const zipCode = user.zip_code || '';

    let fullAddress = address;
    if (apt) fullAddress += ` ${apt}`;
    if (city) fullAddress += city ? `, ${city}` : city;
    if (state) fullAddress += state ? `, ${state}` : state;
    if (zipCode) fullAddress += ` ${zipCode}`;

    return fullAddress.trim() || 'Address not available';
  };

  const getDisplayName = (user: SearchResult) => {
    if (user.account_type === 'business') {
      return user.business_legal_name || user.external_business_name || 'Unknown Business';
    }
    
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return name || user.external_customer_name || 'Unknown User';
  };

  const handleRowClick = (user: SearchResult) => {
    // Navigate to user bills detail view
    navigate(`/municipal/search/user/${user.user_id}`);
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
          <p className="text-muted-foreground">No users found matching your search criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Results ({totalCount} total bills, {data.length} unique users)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name/Business</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Address</TableHead>
                <TableHead className="text-center">Bills</TableHead>
                <TableHead className="text-right">Total Due</TableHead>
                <TableHead className="hidden sm:table-cell text-center">Last Bill</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((user) => (
                <TableRow 
                  key={user.user_id} 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleRowClick(user)}
                >
                  <TableCell className="py-3">
                    <div>
                      <div className="font-medium truncate max-w-[200px]" title={getDisplayName(user)}>
                        {getDisplayName(user)}
                      </div>
                      {user.email && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]" title={user.email}>
                          {user.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-3">
                    {getAccountTypeBadge(user.account_type)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-3">
                    <div className="text-sm truncate max-w-[200px]" title={formatAddress(user)}>
                      {formatAddress(user)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-3">
                    <div className="font-medium">{user.bill_count}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium py-3">
                    {formatAmount(user.total_amount_due_cents / 100)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-center py-3">
                    <div className="text-sm">{formatDate(user.last_bill_date)}</div>
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