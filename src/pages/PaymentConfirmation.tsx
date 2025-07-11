import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, ArrowLeft, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface PaymentHistoryDetails {
  id: string;
  bill_id: string;
  finix_transfer_id: string;
  amount_cents: number;
  service_fee_cents: number;
  total_amount_cents: number;
  payment_type: string;
  transfer_state: string;
  created_at: string;
  master_bills: {
    merchant_name: string;
    external_bill_number: string;
    category: string;
    due_date: string;
  };
}

const PaymentConfirmation = () => {
  const { paymentHistoryId } = useParams<{ paymentHistoryId: string }>();
  const navigate = useNavigate();
  const [paymentDetails, setPaymentDetails] = useState<PaymentHistoryDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!paymentHistoryId) {
        setError('Payment ID not found');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('payment_history')
          .select(`
            *,
            master_bills!inner(
              merchant_name,
              external_bill_number,
              category,
              due_date
            )
          `)
          .eq('id', paymentHistoryId)
          .single();

        if (error) {
          console.error('Error fetching payment details:', error);
          setError('Payment details not found');
          return;
        }

        setPaymentDetails(data);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load payment details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [paymentHistoryId]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy • h:mm a');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !paymentDetails) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive mb-4">{error || 'Payment details not found'}</p>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isSuccessful = paymentDetails.transfer_state === 'SUCCEEDED';

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            isSuccessful ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
          }`}>
            {isSuccessful ? (
              <CheckCircle className="h-8 w-8" />
            ) : (
              <Receipt className="h-8 w-8" />
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isSuccessful ? 'Payment Successful!' : 'Payment Processing'}
          </h1>
          <p className="text-muted-foreground">
            {isSuccessful 
              ? 'Your payment has been processed successfully'
              : 'Your payment is being processed'
            }
          </p>
        </div>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bill From</label>
                <p className="text-base">{paymentDetails.master_bills.merchant_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bill Number</label>
                <p className="text-base">{paymentDetails.master_bills.external_bill_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="text-base">{paymentDetails.master_bills.category || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                <p className="text-base">{formatDate(paymentDetails.master_bills.due_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                <p className="text-base">{paymentDetails.payment_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                <p className="text-base font-mono text-xs">{paymentDetails.finix_transfer_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amount Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Amount Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-base">Bill Amount</span>
                <span className="text-base">{formatCurrency(paymentDetails.amount_cents)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-base">Service Fee</span>
                <span className="text-base">{formatCurrency(paymentDetails.service_fee_cents)}</span>
              </div>
              <div className="border-t border-border my-3"></div>
              <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded">
                <span className="text-base font-semibold">Total Paid</span>
                <span className="text-lg font-bold">{formatCurrency(paymentDetails.total_amount_cents)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Info */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p className={`text-base font-medium ${
                  isSuccessful ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {paymentDetails.transfer_state}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Processed At</label>
                <p className="text-base">{formatDateTime(paymentDetails.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button onClick={() => window.print()}>
            <Receipt className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;