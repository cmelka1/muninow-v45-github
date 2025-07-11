// Google Pay API TypeScript declarations
declare global {
  interface Window {
    google: {
      payments: {
        api: {
          PaymentsClient: new (options: {
            environment: 'TEST' | 'PRODUCTION';
          }) => PaymentsClient;
        };
      };
    };
    googlePayClient: PaymentsClient;
  }
}

export interface PaymentsClient {
  isReadyToPay(request: IsReadyToPayRequest): Promise<IsReadyToPayResponse>;
  createButton(options: CreateButtonOptions): HTMLElement;
  loadPaymentData(request: PaymentDataRequest): Promise<PaymentData>;
}

export interface IsReadyToPayRequest {
  apiVersion: number;
  apiVersionMinor: number;
  allowedPaymentMethods: PaymentMethod[];
}

export interface IsReadyToPayResponse {
  result: boolean;
}

export interface PaymentMethod {
  type: 'CARD';
  parameters: {
    allowedAuthMethods: string[];
    allowedCardNetworks: string[];
  };
  tokenizationSpecification?: TokenizationSpecification;
}

export interface TokenizationSpecification {
  type: 'PAYMENT_GATEWAY';
  parameters: {
    gateway: 'finix';
    gatewayMerchantId: string;
  };
}

export interface CreateButtonOptions {
  onClick: () => void;
  allowedPaymentMethods: PaymentMethod[];
  buttonColor?: 'default' | 'black' | 'white';
  buttonType?: 'buy' | 'book' | 'checkout' | 'donate' | 'order' | 'pay' | 'plain' | 'subscribe';
  buttonLocale?: string;
}

export interface PaymentDataRequest {
  apiVersion: number;
  apiVersionMinor: number;
  allowedPaymentMethods: PaymentMethod[];
  transactionInfo: {
    totalPriceStatus: 'FINAL' | 'ESTIMATED';
    totalPrice: string;
    currencyCode: string;
  };
  merchantInfo: {
    merchantName: string;
  };
}

export interface PaymentData {
  paymentMethodData: {
    tokenizationData: {
      token: string;
    };
  };
}

export {};