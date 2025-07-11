import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Building, Star, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useBill } from '@/hooks/useBill';
import { useUserPaymentInstruments } from '@/hooks/useUserPaymentInstruments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddPaymentMethodDialog } from '@/components/profile/AddPaymentMethodDialog';
import GooglePayButton from '@/components/GooglePayButton';

const BillOverview = () => {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  const [finixAuth, setFinixAuth] = useState<any>(null);
  const [fraudSessionId, setFraudSessionId] = useState<string | null>(null);
  
  const { data: bill, isLoading, error } = useBill(billId!);
  const { 
    paymentInstruments, 
    isLoading: paymentMethodsLoading,
    loadPaymentInstruments
  } = useUserPaymentInstruments();

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

  // Get top 3 payment methods (prioritize default, then by creation date)
  const topPaymentMethods = paymentInstruments
    .slice()
    .sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 3);

  const calculateServiceFee = () => {
    if (!selectedPaymentMethod || !bill) return null;
    
    const selectedInstrument = topPaymentMethods.find(instrument => instrument.id === selectedPaymentMethod);
    if (!selectedInstrument) return null;

    const isCard = selectedInstrument.instrument_type === 'PAYMENT_CARD';
    const basisPoints = isCard ? (bill.basis_points || 250) : (bill.ach_basis_points || 20); // Default values if not set
    const fixedFee = isCard ? (bill.fixed_fee || 50) : (bill.ach_fixed_fee || 50); // In cents

    const percentageFee = Math.round((bill.total_amount_cents * basisPoints) / 10000);
    const totalFee = percentageFee + fixedFee;

    return {
      totalFee,
      percentageFee,
      fixedFee,
      basisPoints,
      isCard
    };
  };

  const serviceFee = calculateServiceFee();
  const totalWithFee = bill ? bill.total_amount_cents + (serviceFee?.totalFee || 0) : 0;

  // Auto-select default payment method when payment methods load
  useEffect(() => {
    if (!selectedPaymentMethod && topPaymentMethods.length > 0) {
      const defaultMethod = topPaymentMethods.find(method => method.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      }
    }
  }, [topPaymentMethods, selectedPaymentMethod]);

  // Initialize Finix Auth for fraud detection
  useEffect(() => {
    const initializeFinixAuth = () => {
      // Check if Finix library is loaded and bill data is available
      if (typeof window !== 'undefined' && window.Finix && bill?.finix_merchant_id) {
        try {
          console.log('Initializing Finix Auth with merchant ID:', bill.finix_merchant_id);
          
          const auth = window.Finix.Auth(
            "sandbox", // Environment
            bill.finix_merchant_id, // Merchant ID from bill data
            (sessionKey: string) => {
              console.log('Finix Auth initialized with session key:', sessionKey);
              setFraudSessionId(sessionKey);
            }
          );
          
          setFinixAuth(auth);
          
          // Also get session key immediately if available
          try {
            const immediateSessionKey = auth.getSessionKey();
            if (immediateSessionKey) {
              setFraudSessionId(immediateSessionKey);
            }
          } catch (error) {
            console.log('Session key not immediately available, will wait for callback');
          }
        } catch (error) {
          console.error('Error initializing Finix Auth:', error);
        }
      }
    };

    // Try to initialize immediately
    initializeFinixAuth();

    // If Finix library is not loaded yet, retry after a short delay
    if (!window.Finix) {
      const retryTimeout = setTimeout(initializeFinixAuth, 1000);
      return () => clearTimeout(retryTimeout);
    }
  }, [bill?.finix_merchant_id]);

  const getCardBrandIcon = (cardBrand: string) => {
    const brandMap: { [key: string]: string } = {
      'visa': 'visa-brandmark-blue-1960x622.webp',
      'mastercard': 'Mastercard-Logo.wine.png',
      'amex': 'Amex_logo_color.png',
      'american express': 'Amex_logo_color.png',
      'discover': 'Discover Logo.png'
    };

    const fileName = brandMap[cardBrand.toLowerCase()];
    if (fileName) {
      return `https://qcuiuubbaozcmejzvxje.supabase.co/storage/v1/object/public/credit-card-logos/${fileName}`;
    }
    return null;
  };

  const getCardIcon = (instrumentType: string, cardBrand?: string) => {
    if (instrumentType === 'BANK_ACCOUNT') {
      return <Building className="h-6 w-6 text-primary" />;
    }
    
    if (cardBrand) {
      const logoUrl = getCardBrandIcon(cardBrand);
      if (logoUrl) {
        return (
          <img 
            src={logoUrl} 
            alt={`${cardBrand} logo`}
            className="h-6 w-6 object-contain"
          />
        );
      }
    }
    
    return <CreditCard className="h-6 w-6 text-primary" />;
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod || !bill) {
      toast({
        title: "Error",
        description: "Please select a payment method and ensure bill details are loaded.",
        variant: "destructive",
      });
      return;
    }

    // Handle Google Pay separately
    if (selectedPaymentMethod === 'google-pay') {
      return handleGooglePayment();
    }

    // Handle regular payment methods
    if (!serviceFee) {
      toast({
        title: "Error",
        description: "Service fee calculation failed. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessingPayment(true);

      // Generate idempotency ID
      const idempotencyId = `${bill.bill_id}-${selectedPaymentMethod}-${Date.now()}`;

      // Get current fraud session ID
      let currentFraudSessionId = fraudSessionId;
      if (finixAuth && !currentFraudSessionId) {
        try {
          currentFraudSessionId = finixAuth.getSessionKey();
          setFraudSessionId(currentFraudSessionId);
        } catch (error) {
          console.warn('Could not get fraud session ID:', error);
        }
      }

      console.log('Processing payment with fraud session ID:', currentFraudSessionId);

      const { data, error } = await supabase.functions.invoke('process-finix-transfer', {
        body: {
          bill_id: bill.bill_id,
          payment_instrument_id: selectedPaymentMethod,
          total_amount_cents: totalWithFee,
          idempotency_id: idempotencyId,
          fraud_session_id: currentFraudSessionId
        }
      });

      if (error) {
        console.error('Payment error:', error);
        toast({
          title: "Payment Failed",
          description: "There was an error processing your payment. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data.success) {
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully.",
        });
        
        // Navigate to payment confirmation page
        navigate(data.redirect_url);
      } else {
        toast({
          title: "Payment Failed",
          description: data.error || "Payment processing failed. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleGooglePayment = async () => {
    try {
      setIsProcessingPayment(true);

      // Check if Google Pay is available
      if (!window.googlePayClient) {
        throw new Error('Google Pay is not available');
      }

      // Define payment request
      const allowedAuthMethods: string[] = ["PAN_ONLY", "CRYPTOGRAM_3DS"];
      const allowedCardNetworks: string[] = ["AMEX", "DISCOVER", "INTERAC", "JCB", "MASTERCARD", "VISA"];
      
      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: "CARD" as const,
          parameters: {
            allowedAuthMethods,
            allowedCardNetworks,
          },
          tokenizationSpecification: {
            type: "PAYMENT_GATEWAY" as const,
            parameters: {
              gateway: "finix" as const,
              gatewayMerchantId: bill.finix_merchant_id,
            },
          },
        }],
        transactionInfo: {
          countryCode: 'US' as const,
          currencyCode: 'USD' as const,
          totalPrice: (totalWithFee / 100).toFixed(2),
          totalPriceStatus: 'FINAL' as const,
        },
        merchantInfo: {
          merchantId: 'BCR2DN6T2TX3W7ZW', // Default test merchant ID
          merchantName: bill.merchant_name || bill.business_legal_name || 'Merchant',
        },
      };

      // Load payment data from Google Pay
      const paymentData = await window.googlePayClient.loadPaymentData(paymentDataRequest);
      
      console.log('Google Pay payment data received:', paymentData);

      // Extract token and billing info
      const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
      const billingAddress = paymentData.paymentMethodData.info?.billingAddress;

      // Generate idempotency ID
      const idempotencyId = `googlepay_${bill.bill_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Call our edge function to process the payment
      const { data, error } = await supabase.functions.invoke('process-google-pay-transfer', {
        body: {
          bill_id: bill.bill_id,
          google_pay_token: paymentToken,
          total_amount_cents: totalWithFee,
          idempotency_id: idempotencyId,
          billing_address: billingAddress ? {
            name: billingAddress.name,
            postal_code: billingAddress.postalCode,
            country: billingAddress.countryCode
          } : undefined
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Payment Successful",
          description: "Your Google Pay payment has been processed successfully.",
        });
        if (data.redirect_url) {
          navigate(data.redirect_url);
        }
      } else {
        throw new Error(data?.error || 'Payment failed');
      }

    } catch (error) {
      console.error('Google Pay payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || 'Google Pay payment failed. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
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
      <div className="min-h-screen bg-gray-100 p-6">
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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Bill Details</h1>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Existing Tiles */}
          <div className="lg:col-span-8 space-y-6">
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
                    <span className="text-base font-medium text-right">
                      {serviceFee ? (
                        formatCurrency(serviceFee.totalFee)
                      ) : selectedPaymentMethod ? (
                        formatCurrency(0)
                      ) : (
                        "Select payment method"
                      )}
                    </span>
                  </div>
                  
                  {/* Separator */}
                  <div className="border-t border-border my-3"></div>
                  
                  {/* Total */}
                  <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded">
                    <span className="text-base font-semibold">Total Amount Due</span>
                    <span className="text-lg font-bold">{formatCurrency(totalWithFee)}</span>
                  </div>
                </div>
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

          {/* Right Column - Check Out Tile */}
          <div className="lg:col-span-4">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Check Out</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bill Summary Section */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Bill Summary</h3>
                  <div className="space-y-2">
                    <p className="text-base font-medium">{bill.merchant_name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{bill.category || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(bill.due_date)}</p>
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t border-border"></div>

                {/* Payment Method Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Payment Method</h3>
                  </div>

                  {paymentMethodsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : topPaymentMethods.length > 0 ? (
                    <div className="space-y-2">
                      {topPaymentMethods.map((instrument) => (
                        <div
                          key={instrument.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            selectedPaymentMethod === instrument.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedPaymentMethod(instrument.id)}
                        >
                          <div className="flex items-center space-x-3">
                            {getCardIcon(instrument.instrument_type, instrument.card_brand || undefined)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium truncate">
                                  {instrument.display_name}
                                </p>
                                {instrument.is_default && (
                                  <Badge variant="default" className="text-xs">
                                    <Star className="h-3 w-3 mr-1" />
                                    Default
                                  </Badge>
                                )}
                              </div>
                              {instrument.instrument_type === 'PAYMENT_CARD' && 
                               instrument.card_expiration_month && 
                               instrument.card_expiration_year && (
                                <p className="text-xs text-muted-foreground">
                                  Expires {instrument.card_expiration_month.toString().padStart(2, '0')}/{instrument.card_expiration_year}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">No payment methods added</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/profile?tab=payment-methods')}
                      >
                        Add Payment Method
                      </Button>
                     </div>
                   )}

                     {/* Google Pay Option */}
                     {bill?.finix_merchant_id && (
                       <GooglePayButton
                         isSelected={selectedPaymentMethod === 'google-pay'}
                         onSelect={() => setSelectedPaymentMethod('google-pay')}
                         isDisabled={false}
                         merchantId={bill.finix_merchant_id}
                       />
                     )}
                 </div>

                 {/* Separator */}
                 <div className="border-t border-border"></div>

                 {/* Pay Now Section */}
                <div className="space-y-3">
                   <Button 
                     className="w-full" 
                     size="lg"
                     disabled={!selectedPaymentMethod || isProcessingPayment}
                     onClick={handlePayment}
                   >
                    {isProcessingPayment ? 'Processing...' : `Pay ${formatCurrency(totalWithFee)}`}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    size="lg"
                    onClick={() => setIsAddPaymentDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Payment Method
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Your payment will be processed securely
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <AddPaymentMethodDialog
        open={isAddPaymentDialogOpen}
        onOpenChange={setIsAddPaymentDialogOpen}
        onSuccess={async (paymentMethodId) => {
          await loadPaymentInstruments();
          if (paymentMethodId) {
            setSelectedPaymentMethod(paymentMethodId);
          }
        }}
      />
    </div>
  );
};

export default BillOverview;