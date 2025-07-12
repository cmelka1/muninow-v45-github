import React, { useState } from 'react';
import { CreditCard, Building, Star, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { AddPaymentMethodDialog } from '@/components/profile/AddPaymentMethodDialog';
import PaymentButtonsContainer from '@/components/PaymentButtonsContainer';

interface PaymentMethodsModuleProps {
  bill: any;
  onPaymentSuccess?: (result: any) => void;
  onPaymentError?: (error: string) => void;
  className?: string;
  showTitle?: boolean;
  maxPaymentMethods?: number;
}

const PaymentMethodsModule: React.FC<PaymentMethodsModuleProps> = ({
  bill,
  onPaymentSuccess,
  onPaymentError,
  className = "",
  showTitle = true,
  maxPaymentMethods = 3
}) => {
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  
  const {
    paymentInstruments,
    paymentMethodsLoading,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee,
    isPaymentAvailable,
    googlePayMerchantId,
    handleRegularPayment,
    handleGooglePayment,
    handleApplePayment,
    loadPaymentInstruments
  } = usePaymentMethods(bill);

  // Limit payment methods to maxPaymentMethods
  const topPaymentMethods = paymentInstruments.slice(0, maxPaymentMethods);

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

  if (!isPaymentAvailable) {
    return (
      <Card className={`border-warning bg-warning/5 ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-warning font-medium">Payment Not Available</p>
            <p className="text-sm text-muted-foreground">
              Payment processing is not available for this bill. The merchant account may not be fully configured.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showTitle && (
        <h2 className="text-2xl font-bold tracking-tight">Payment</h2>
      )}

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center py-2">
            <span className="text-base">Amount Due</span>
            <span className="text-base font-medium">{formatCurrency((bill?.total_amount_cents || 0) / 100)}</span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-base">Service Fee</span>
            <span className="text-base font-medium text-right">
              {serviceFee ? (
                formatCurrency(serviceFee.totalFee / 100)
              ) : selectedPaymentMethod ? (
                formatCurrency(0)
              ) : (
                "Select payment method"
              )}
            </span>
          </div>
          
          <div className="border-t border-border my-2"></div>
          
          <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-xl font-bold">{formatCurrency(totalWithFee / 100)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Methods</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddPaymentDialogOpen(true)}
              className="text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethodsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : topPaymentMethods.length > 0 ? (
            <div className="space-y-3">
              {topPaymentMethods.map((instrument) => (
                <div
                  key={instrument.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPaymentMethod === instrument.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPaymentMethod(instrument.id)}
                >
                  <div className="flex items-center space-x-4">
                    {getCardIcon(instrument.instrument_type, instrument.card_brand || undefined)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-base truncate">
                          {instrument.nickname || 
                           (instrument.instrument_type === 'PAYMENT_CARD' 
                             ? `${instrument.card_brand || 'Card'} •••• ${instrument.card_last_four}`
                             : `Bank Account •••• ${instrument.bank_last_four}`)}
                        </span>
                        {instrument.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      {instrument.instrument_type === 'PAYMENT_CARD' && instrument.card_expiration_month && instrument.card_expiration_year && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Expires {String(instrument.card_expiration_month).padStart(2, '0')}/{instrument.card_expiration_year}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No payment methods found</p>
                <p className="text-sm">Add a payment method to continue</p>
              </div>
              <Button onClick={() => setIsAddPaymentDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Actions */}
      {topPaymentMethods.length > 0 && (
        <div className="space-y-4">
          {/* Google Pay and Apple Pay */}
          {bill?.merchant_finix_identity_id && googlePayMerchantId && (
            <PaymentButtonsContainer
              bill={bill}
              totalAmount={totalWithFee}
              merchantFinixIdentityId={bill.merchant_finix_identity_id}
              googlePayMerchantId={googlePayMerchantId}
              isDisabled={isProcessingPayment}
              onGooglePayment={handleGooglePayment}
              onApplePayment={handleApplePayment}
            />
          )}

          {/* Regular Payment Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleRegularPayment}
            disabled={!selectedPaymentMethod || isProcessingPayment}
          >
            {isProcessingPayment ? (
              "Processing..."
            ) : (
              `Pay ${formatCurrency(totalWithFee / 100)}`
            )}
          </Button>
        </div>
      )}

      <AddPaymentMethodDialog
        open={isAddPaymentDialogOpen}
        onOpenChange={setIsAddPaymentDialogOpen}
        onSuccess={loadPaymentInstruments}
      />
    </div>
  );
};

export default PaymentMethodsModule;