import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, ArrowLeft, Receipt, Download } from 'lucide-react';
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
  card_brand?: string;
  card_last_four?: string;
  bank_last_four?: string;
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

  const getPaymentMethodDisplay = () => {
    // For card payments
    if (paymentDetails.card_brand && paymentDetails.card_last_four) {
      const brandName = paymentDetails.card_brand.charAt(0).toUpperCase() + paymentDetails.card_brand.slice(1).toLowerCase();
      return `${brandName} •••• ${paymentDetails.card_last_four}`;
    }
    
    // For bank account payments
    if (paymentDetails.bank_last_four) {
      return `Bank Account •••• ${paymentDetails.bank_last_four}`;
    }
    
    // For digital wallet payments or fallback
    return paymentDetails.payment_type;
  };

  const handleDownloadPDF = () => {
    // Create a new window for print
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Generate PDF-friendly HTML content
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Confirmation - ${paymentDetails.master_bills.external_bill_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            .label { font-weight: bold; color: #666; font-size: 12px; }
            .value { margin-top: 3px; }
            .total-row { background: #f5f5f5; padding: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; }
            .divider { border-top: 1px solid #ddd; margin: 15px 0; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payment Confirmation</h1>
            <p>Payment ${paymentDetails.transfer_state === 'SUCCEEDED' ? 'Successful' : 'Processing'}</p>
          </div>
          
          <div class="section">
            <h2>Payment Details</h2>
            <div class="grid">
              <div><div class="label">Bill From</div><div class="value">${paymentDetails.master_bills.merchant_name}</div></div>
              <div><div class="label">Bill Number</div><div class="value">${paymentDetails.master_bills.external_bill_number}</div></div>
              <div><div class="label">Category</div><div class="value">${paymentDetails.master_bills.category || 'N/A'}</div></div>
              <div><div class="label">Due Date</div><div class="value">${formatDate(paymentDetails.master_bills.due_date)}</div></div>
              <div><div class="label">Payment Method</div><div class="value">${getPaymentMethodDisplay()}</div></div>
              <div><div class="label">Transaction ID</div><div class="value" style="font-family: monospace; font-size: 11px;">${paymentDetails.finix_transfer_id}</div></div>
            </div>
          </div>
          
          <div class="section">
            <h2>Amount Breakdown</h2>
            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span>Bill Amount</span>
                <span>${formatCurrency(paymentDetails.amount_cents)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span>Service Fee</span>
                <span>${formatCurrency(paymentDetails.service_fee_cents)}</span>
              </div>
            </div>
            <div class="divider"></div>
            <div class="total-row">
              <span style="font-weight: bold;">Total Paid</span>
              <span style="font-weight: bold; font-size: 18px;">${formatCurrency(paymentDetails.total_amount_cents)}</span>
            </div>
          </div>
          
          <div class="section">
            <h2>Transaction Information</h2>
            <div class="grid">
              <div><div class="label">Status</div><div class="value" style="color: ${paymentDetails.transfer_state === 'SUCCEEDED' ? '#16a34a' : '#ca8a04'}; font-weight: bold;">${paymentDetails.transfer_state}</div></div>
              <div><div class="label">Processed At</div><div class="value">${formatDateTime(paymentDetails.created_at)}</div></div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print dialog
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
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
        {/* Top Navigation */}
        <div className="flex justify-start mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
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
                <p className="text-base">{getPaymentMethodDisplay()}</p>
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
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
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