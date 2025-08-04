import GooglePayButton from "@/components/GooglePayButton";
import ApplePayButton from "@/components/ApplePayButton";
import PaymentButtonsContainer from "@/components/PaymentButtonsContainer";

interface PermitPaymentButtonsProps {
  permit: any;
  totalAmount: number;
  onGooglePayment: () => Promise<void>;
  onApplePayment: () => Promise<void>;
  isDisabled?: boolean;
}

const PermitPaymentButtons: React.FC<PermitPaymentButtonsProps> = ({
  permit,
  totalAmount,
  onGooglePayment,
  onApplePayment,
  isDisabled = false
}) => {
  // Extract merchant ID from permit structure
  const merchantId = permit?.municipal_permit_merchants?.merchants?.finix_merchant_id;

  if (!merchantId) {
    return null;
  }

  return (
    <PaymentButtonsContainer
      bill={permit}
      totalAmount={totalAmount}
      merchantId={merchantId}
      isDisabled={isDisabled}
      onGooglePayment={onGooglePayment}
      onApplePayment={onApplePayment}
    />
  );
};

export default PermitPaymentButtons;