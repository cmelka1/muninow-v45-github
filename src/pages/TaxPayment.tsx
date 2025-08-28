import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calculator, FileText, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TaxDocumentUpload } from '@/components/TaxDocumentUpload';
import { TaxPaymentButtonsContainer } from '@/components/TaxPaymentButtonsContainer';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import PaymentSummary from '@/components/PaymentSummary';
import { useTaxPaymentMethods } from '@/hooks/useTaxPaymentMethods';
import { useTaxSubmissionDocuments } from '@/hooks/useTaxSubmissionDocuments';
import { formatCurrency } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';

interface StagedDocument {
  id: string;
  file_name: string;
  original_file_name: string;
  document_type: string;
  description: string | null;
  file_size: number;
  content_type: string;
  upload_progress: number;
  status: 'staged' | 'confirmed' | 'failed';
  created_at: string;
}

const TaxPayment: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState<StagedDocument[]>([]);
  
  // Get tax data from URL params (this would typically come from a form)
  const municipality = searchParams.get('municipality');
  const taxType = searchParams.get('taxType') || 'food_beverage';
  const amount = parseInt(searchParams.get('amount') || '0');
  const calculationData = searchParams.get('calculationData') ? 
    JSON.parse(decodeURIComponent(searchParams.get('calculationData') || '{}')) : {};
  const payer = searchParams.get('payer') ? 
    JSON.parse(decodeURIComponent(searchParams.get('payer') || '{}')) : {};

  // Document upload hook
  const {
    areUploadsInProgress,
    allUploadsComplete,
    uploadingCount,
    stagingId
  } = useTaxSubmissionDocuments();

  // Payment methods hook
  const {
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee,
    paymentInstruments,
    topPaymentMethods,
    paymentMethodsLoading,
    googlePayMerchantId,
    handlePayment,
    handleGooglePayment,
    handleApplePayment
  } = useTaxPaymentMethods({
    municipality: municipality ? JSON.parse(decodeURIComponent(municipality)) : null,
    taxType,
    amount,
    calculationData,
    payer,
    stagingId
  });

  const handleMainPayment = async () => {
    try {
      const result = await handlePayment();
      if (result && 'taxSubmissionId' in result && result.taxSubmissionId) {
        toast({
          title: "Payment Successful",
          description: "Your tax payment has been processed successfully.",
        });
        navigate(`/tax/${result.taxSubmissionId}`);
      }
    } catch (error) {
      console.error('Payment failed:', error);
      // Error already handled by the payment hook
    }
  };

  const handleGooglePay = async () => {
    try {
      await handleGooglePayment();
      navigate('/taxes');
    } catch (error) {
      console.error('Google Pay failed:', error);
      // Error already handled by the payment hook
    }
  };

  const handleApplePay = async () => {
    try {
      await handleApplePayment();
      navigate('/taxes');
    } catch (error) {
      console.error('Apple Pay failed:', error);
      // Error already handled by the payment hook
    }
  };

  if (!municipality || !amount) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive">Invalid payment parameters. Please start over.</p>
            <Button
              variant="outline"
              onClick={() => navigate('/taxes')}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Taxes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/taxes')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold">Complete Tax Payment</h1>
          <p className="text-muted-foreground">
            {taxType.replace('_', ' & ').replace(/\b\w/g, l => l.toUpperCase())} Tax Payment
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tax Calculation Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Tax Calculation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Tax Amount</span>
                  <span className="font-medium">{formatCurrency(amount / 100)}</span>
                </div>
                {calculationData.calculationNotes && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {calculationData.calculationNotes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Upload */}
          <TaxDocumentUpload
            documents={documents}
            onDocumentsChange={setDocuments}
            disabled={isProcessingPayment}
            stagingId={stagingId}
          />

          {/* Payment Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentMethodsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading payment methods...</span>
                </div>
              ) : (
              <PaymentMethodSelector
                paymentInstruments={paymentInstruments}
                selectedPaymentMethod={selectedPaymentMethod}
                onSelectPaymentMethod={setSelectedPaymentMethod}
                isLoading={paymentMethodsLoading}
              />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Payment Summary & Actions */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <PaymentSummary
            baseAmount={amount}
            serviceFee={serviceFee}
            selectedPaymentMethod={selectedPaymentMethod}
          />

          {/* Payment Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Complete Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <TaxPaymentButtonsContainer
                isProcessingPayment={isProcessingPayment}
                areUploadsInProgress={areUploadsInProgress}
                uploadingCount={uploadingCount}
                allUploadsComplete={allUploadsComplete}
                hasDocuments={documents.length > 0}
                onPayment={handleMainPayment}
                onGooglePayment={handleGooglePay}
                onApplePayment={handleApplePay}
                googlePayMerchantId={googlePayMerchantId}
                totalAmount={totalWithFee}
                disabled={!selectedPaymentMethod}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TaxPayment;