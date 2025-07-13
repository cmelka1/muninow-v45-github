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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useUserPaymentHistory } from '@/hooks/useUserPaymentHistory';

interface UserPaymentHistoryTableProps {
  userId: string;
}

const UserPaymentHistoryTable: React.FC<UserPaymentHistoryTableProps> = ({ userId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const navigate = useNavigate();
  
  const { data: paymentData, isLoading, error } = useUserPaymentHistory({ 
    userId,
    page: currentPage, 
    pageSize
  });

  const payments = paymentData?.data || [];
  const totalCount = paymentData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatPaymentMethod = (payment: any) => {
    if (payment.payment_type === 'Google Pay') {
      return 'Google Pay';
    }
    if (payment.payment_type === 'Apple Pay') {
      return 'Apple Pay';
    }
    if (payment.payment_type === 'Bank Account' || payment.bank_last_four) {
      return `Bank Account ${payment.bank_last_four || ''}`;
    }
    if (payment.payment_type === 'Card' || payment.card_brand) {
      return `${payment.card_brand || 'Card'} ${payment.card_last_four || ''}`;
    }
    return payment.payment_type || 'Payment Method';
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

  const handleRowClick = (paymentId: string) => {
    navigate(`/payment-confirmation/${paymentId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
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
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading payment history. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No payment history found for this user.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History ({totalCount})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="hidden sm:table-cell">Paid Date</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="text-right">Amount Paid</TableHead>
                <TableHead className="hidden md:table-cell">Payment Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow 
                  key={payment.id} 
                  className="h-12 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(payment.id)}
                >
                  <TableCell className="hidden sm:table-cell py-2">
                    <span className="truncate">{formatDate(payment.created_at)}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="truncate block max-w-[200px]" title={payment.merchant_name}>
                      {payment.merchant_name || 'Unknown Merchant'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <span className="truncate block max-w-[150px]" title={payment.category}>
                      {payment.category || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium py-2">
                    {formatAmount(payment.total_amount_cents)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <span className="truncate block max-w-[150px]" title={formatPaymentMethod(payment)}>
                      {formatPaymentMethod(payment)}
                    </span>
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

export default UserPaymentHistoryTable;