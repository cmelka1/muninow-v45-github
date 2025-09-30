import React, { useState, useEffect } from 'react';
import GooglePayButton from './GooglePayButton';

interface PaymentButtonsContainerProps {
  bill: any;
  totalAmount: number;
  merchantId: string;
  isDisabled?: boolean;
  onGooglePayment: () => Promise<void>;
  onApplePayment: () => Promise<void>;
}

const PaymentButtonsContainer: React.FC<PaymentButtonsContainerProps> = ({
  bill,
  totalAmount,
  merchantId,
  isDisabled = false,
  onGooglePayment,
  onApplePayment
}) => {
  // Temporarily hidden - Google Pay and Apple Pay buttons are disabled
  return null;
};

export default PaymentButtonsContainer;