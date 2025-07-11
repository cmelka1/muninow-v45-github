import React from 'react';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBill } from '@/hooks/useBill';

const BillOverview = () => {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const { data: bill, isLoading, error } = useBill(billId!);

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatCurrency = (cents: number | null) => {
    if (cents === null || cents === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive">Error loading bill details. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Bill Details</h1>
        </div>

        {/* Bill Overview Tile */}
        <Card>
          <CardHeader>
            <CardTitle>Bill Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Merchant Name</label>
                <p className="text-base">{bill.merchant_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">System Account Number</label>
                <p className="text-base">{bill.external_account_number || 'N/A'}</p>
              </div>
              {bill.external_bill_number && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">System Bill Number</label>
                  <p className="text-base">{bill.external_bill_number}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="text-base">{bill.category || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Issue Date</label>
                <p className="text-base">{formatDate(bill.issue_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Subcategory</label>
                <p className="text-base">{bill.subcategory || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                <p className="text-base">{formatDate(bill.due_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Address Tile */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-base">{bill.external_customer_address_line1 || 'N/A'}</p>
              {bill.external_customer_address_line2 && (
                <p className="text-base">{bill.external_customer_address_line2}</p>
              )}
              <p className="text-base">
                {bill.external_customer_city && bill.external_customer_state && bill.external_customer_zip_code
                  ? `${bill.external_customer_city}, ${bill.external_customer_state} ${bill.external_customer_zip_code}`
                  : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details Tile */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* Line Items */}
              <div className="flex justify-between items-center py-2">
                <span className="text-base">Amount Due</span>
                <span className="text-base font-medium">{formatCurrency(bill.total_amount_cents)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-base">Service Fee</span>
                <span className="text-base font-medium">—</span>
              </div>
              
              {/* Separator */}
              <div className="border-t border-border my-3"></div>
              
              {/* Total */}
              <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded">
                <span className="text-base font-semibold">Total Amount Due</span>
                <span className="text-lg font-bold">{formatCurrency(bill.total_amount_cents)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check Out Tile */}
        <Card>
          <CardHeader>
            <CardTitle>Check Out</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>

        {/* Notification History Tile */}
        <Card>
          <CardHeader>
            <CardTitle>Notification History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BillOverview;