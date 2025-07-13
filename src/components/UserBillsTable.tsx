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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useUserBills } from '@/hooks/useUserBills';

interface UserBillsTableProps {
  userId: string;
}

const UserBillsTable: React.FC<UserBillsTableProps> = ({ userId }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  
  const { data: billsData, isLoading, error } = useUserBills({ 
    userId,
    page: currentPage, 
    pageSize
  });

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
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleRowClick = (billId: string) => {
    navigate(`/bill/${billId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Bills</CardTitle>
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
          <CardTitle>Active Bills</CardTitle>
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
          <CardTitle>Active Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No active bills found for this user.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Bills ({totalCount})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell text-center">Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow 
                  key={bill.bill_id} 
                  className="h-12 cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleRowClick(bill.bill_id)}
                >
                  <TableCell className="hidden sm:table-cell py-2">
                    <span className="truncate">{formatDate(bill.due_date)}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="truncate block max-w-[200px]" title={bill.merchant_name}>
                      {bill.merchant_name}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <span className="truncate block max-w-[150px]" title={bill.category}>
                      {bill.category}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-2 text-center">
                    {getStatusBadge(bill.payment_status || 'unpaid')}
                  </TableCell>
                  <TableCell className="text-right font-medium py-2">
                    {formatAmount(Number(bill.amount_due_cents) / 100)}
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

export default UserBillsTable;