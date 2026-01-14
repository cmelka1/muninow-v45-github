export interface ApplePayBillingContact {
  addressLines?: string[];
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  emailAddress?: string;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
}

export interface ApplePayPaymentToken {
  paymentData: any; // Opaque blob
  paymentMethod: {
    displayName: string;
    network: string;
    type: string;
  };
  transactionIdentifier: string;
}

export interface ApplePaySessionParams {
  displayName: string;
  domain: string;
  merchantIdentity: string;
  validationUrl: string;
}

export interface ApplePaySessionResponse {
  epochTimestamp: number;
  expiresAt: number;
  merchantSessionIdentifier: string;
  nonce: string;
  merchantIdentifier: string;
  domainName: string;
  displayName: string;
  signature: string;
  operationalAnalyticsIdentifier: string;
  retries: number;
  pspId: string;
}
