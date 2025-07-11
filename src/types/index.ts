export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  benefits: string[];
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
}

export interface Breadcrumb {
  name: string;
  url: string;
}

export interface MunicipalService {
  id: string;
  name: string;
  description: string;
  category: string;
  features: string[];
  icon?: string;
}

export interface ApplePayButtonProps {
  onPayment: () => Promise<void>;
  bill: any;
  totalAmount: number;
  isDisabled?: boolean;
}

declare global {
  interface Window {
    ApplePaySession?: {
      canMakePayments(): boolean;
      new(version: number, paymentRequest: any): any;
      STATUS_SUCCESS: number;
      STATUS_FAILURE: number;
      STATUS_INVALID_BILLING_ADDRESS: number;
      STATUS_INVALID_SHIPPING_ADDRESS: number;
      STATUS_INVALID_SHIPPING_CONTACT: number;
      STATUS_INVALID_PAYMENT_METHOD: number;
    };
  }
}