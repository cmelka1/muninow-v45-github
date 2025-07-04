import React from 'react';
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
import { useMunicipalBills } from '@/hooks/useMunicipalBills';

const BillsTable = () => {
  const { data: bills, isLoading, error } = useMunicipalBills();

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
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
      </CardContent>
    </Card>
  );
};

export default BillsTable;