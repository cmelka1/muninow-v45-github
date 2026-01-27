import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserPaymentInstruments, UserPaymentInstrument } from './useUserPaymentInstruments';
import { useUnifiedPaymentFlow } from './useUnifiedPaymentFlow';
import { ServiceFee, PaymentResponse, GooglePayMerchantResponse } from '@/types/payment';
import { useSessionValidation } from '@/hooks/useSessionValidation';

export const useTaxPaymentMethods = (taxData: {
  municipality: any;
  taxType: string;
  taxTypeMerchantId?: string; // Optional: merchant_id from the selected tax type
  amount: number; // in cents
  calculationData?: any;
  payer?: any;
  taxPeriodStart?: string;
  taxPeriodEnd?: string;
  taxYear?: number;
  stagingId?: string;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { paymentInstruments, isLoading: paymentMethodsLoading, loadPaymentInstruments } = useUserPaymentInstruments();
  const { ensureValidSession } = useSessionValidation();
  
  // State for tax submission ID once created
  const [taxSubmissionId, setTaxSubmissionId] = useState<string | null>(null);
  
  // Determine merchant: use tax type's merchant if set, otherwise fall back to municipality
  const effectiveMerchantId = taxData.taxTypeMerchantId || taxData.municipality?.merchant_id || '';
  
  // Use unified payment flow for tax submissions
  const unifiedPayment = useUnifiedPaymentFlow({
    entityType: 'tax_submission',
    entityId: taxSubmissionId || 'temp-id', // Will be updated when tax submission is created
    merchantId: effectiveMerchantId,
    baseAmountCents: taxData.amount,
    onSuccess: (response) => {
      console.log('Tax payment successful:', response);
      toast({
        title: "Payment Successful",
        description: "Your tax payment has been processed successfully.",
      });
    },
    onError: (error) => {
      console.error('Tax payment failed:', error);
    }
  });

  // Get top 3 payment methods, with default first
  const topPaymentMethods = paymentInstruments
    .sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 3);

  // Map unified payment flow state to legacy interface
  const selectedPaymentMethod = unifiedPayment.selectedPaymentMethod;
  const setSelectedPaymentMethod = unifiedPayment.setSelectedPaymentMethod;
  const isProcessingPayment = unifiedPayment.isProcessingPayment;
  const serviceFee = unifiedPayment.serviceFee ? {
    totalFee: unifiedPayment.serviceFee.serviceFeeToDisplay,
    percentageFee: 0,
    fixedFee: 0,
    basisPoints: unifiedPayment.serviceFee.basisPoints,
    isCard: unifiedPayment.serviceFee.isCard,
    totalAmountToCharge: unifiedPayment.serviceFee.totalAmountToCharge,
    serviceFeeToDisplay: unifiedPayment.serviceFee.serviceFeeToDisplay
  } : null;
  const totalWithFee = unifiedPayment.serviceFee?.totalAmountToCharge || taxData.amount;
  const googlePayMerchantId = unifiedPayment.googlePayMerchantId;

  // Service fee calculation and payment method selection is handled by unified payment flow

  // Handle regular payment processing using unified payment flow
  const handlePayment = async (): Promise<{ taxSubmissionId?: string } | void> => {
    if (!selectedPaymentMethod || !user) {
      toast({
        title: "Error",
        description: "Please select a payment method and ensure you are logged in.",
        variant: "destructive",
      });
      return;
    }

    // Validate session before processing payment
    const sessionValid = await ensureValidSession();
    
    if (!sessionValid) {
      return;
    }

    // Validate municipality configuration
    if (!taxData.municipality?.customer_id || !taxData.municipality?.merchant_id) {
      toast({
        title: "Configuration Error",
        description: "This municipality is not configured for online payments. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    // Validate amount is reasonable
    if (!totalWithFee || totalWithFee <= 0) {
      toast({
        title: "Invalid Amount",
        description: "The payment amount must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First create a tax submission record to get the entity ID
      // Note: total_amount_due_cents and service_fee_cents will be calculated during payment
      const { data: taxSubmission, error: taxError } = await supabase.functions.invoke('create-tax-submission-with-payment', {
        body: {
          user_id: user.id,
          customer_id: taxData.municipality.customer_id,
          merchant_id: taxData.municipality.merchant_id,
          tax_type: taxData.taxType,
          tax_period_start: taxData.taxPeriodStart,
          tax_period_end: taxData.taxPeriodEnd,
          tax_year: taxData.taxYear,
          base_amount_cents: taxData.amount,
          calculation_notes: taxData.calculationData?.calculationNotes || '',
          payer_first_name: taxData.payer?.firstName || '',
          payer_last_name: taxData.payer?.lastName || '',
          payer_email: taxData.payer?.email || '',
          payer_ein: taxData.payer?.ein || '',
          payer_phone: taxData.payer?.phone || '',
          payer_business_name: taxData.payer?.businessName || '',
          payer_street_address: taxData.payer?.address?.street || '',
          payer_city: taxData.payer?.address?.city || '',
          payer_state: taxData.payer?.address?.state || '',
          payer_zip_code: taxData.payer?.address?.zipCode || ''
        }
      });

      if (taxError || !taxSubmission?.tax_submission_id) {
        throw new Error(taxError?.message || 'Failed to create tax submission');
      }

      // Update tax submission ID for state (for UI/tracking purposes)
      setTaxSubmissionId(taxSubmission.tax_submission_id);

      // Process payment using unified flow - pass entity ID directly to avoid state timing issues
      const response = await unifiedPayment.handlePayment(taxSubmission.tax_submission_id);
      return { taxSubmissionId: taxSubmission.tax_submission_id };
    } catch (error: any) {
      console.error('Tax payment error:', error);
      throw error;
    }
  };

  // Handle Google Pay payment using unified flow
  const handleGooglePayment = async (): Promise<void> => {
    // Validate session before processing payment
    const sessionValid = await ensureValidSession();
    
    if (!sessionValid) {
      return;
    }

    if (!googlePayMerchantId) {
      toast({
        title: "Error",
        description: "Google Pay is not configured for this municipality.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Set payment method to google-pay to trigger unified flow
      setSelectedPaymentMethod('google-pay');
      await unifiedPayment.handleGooglePayment();
    } catch (error: any) {
      console.error('Google Pay payment error:', error);
      // Error handling is done in unified payment flow
    }
  };

  // Handle Apple Pay payment using unified flow
  const handleApplePayment = async (): Promise<void> => {
    if (!window.ApplePaySession?.canMakePayments()) {
      toast({
        title: "Error",
        description: "Apple Pay is not available on this device.",
        variant: "destructive",
      });
      return;
    }

    // Validate session before processing payment
    const sessionValid = await ensureValidSession();
    
    if (!sessionValid) {
      return;
    }

    try {
      console.log('Apple Pay not available - requires authentication');
      toast({
        title: 'Authentication Required',
        description: 'Please log in to use Apple Pay',
        variant: 'destructive',
      });
    } catch (error: any) {
      console.error('Apple Pay payment error:', error);
    }
  };

  return {
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
    handleApplePayment,
    loadPaymentInstruments
  };
};