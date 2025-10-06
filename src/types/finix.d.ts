// Finix JavaScript Library TypeScript Declarations

declare global {
  interface Window {
    Finix: {
      Auth: (
        environment: string,
        merchantId: string,
        callback?: (sessionKey: string) => void
      ) => FinixAuth;
      CardTokenForm: (containerId: string, config?: FinixFormConfig) => FinixTokenForm;
      BankTokenForm: (containerId: string, config?: FinixFormConfig) => FinixTokenForm;
    };
  }
}

interface FinixAuth {
  getSessionKey(): string;
}

interface FinixFormConfig {
  styles?: FinixFormStyles;
  showAddress?: boolean;
  showLabels?: boolean;
  labels?: Record<string, string>;
  showPlaceholders?: boolean;
  placeholders?: Record<string, string>;
  hideFields?: string[];
  requiredFields?: string[];
  hideErrorMessages?: boolean;
  errorMessages?: Record<string, string>;
  
  // Default values for form fields (can include address for AVS validation)
  // Address fields supported by Finix:
  // - address_line1: Street address
  // - address_line2: Apt/Suite (optional)
  // - address_city: City
  // - address_region: State/Province
  // - address_postal_code: Zip/Postal code
  // - address_country: Country code (e.g., 'USA')
  defaultValues?: {
    address_line1?: string;
    address_line2?: string;
    address_city?: string;
    address_region?: string;
    address_postal_code?: string;
    address_country?: string;
    [key: string]: string | undefined;
  };
  
  fonts?: Array<{ family: string; src: string }>;
}

interface FinixTokenForm {
  submit(environment: 'sandbox' | 'live', applicationId: string, callback: (err: any, res: any) => void): void;
  on(event: 'ready' | 'change' | 'error', callback: (data?: any) => void): void;
  clear(): void;
  destroy(): void;
}

interface FinixFormStyles {
  base?: {
    fontSize?: string;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    padding?: string;
    borderRadius?: string;
    border?: string;
    '::placeholder'?: {
      color?: string;
    };
  };
  focus?: {
    borderColor?: string;
    outline?: string;
  };
  error?: {
    borderColor?: string;
    color?: string;
  };
}

interface FinixTokenResponse {
  token: string;
  last_four?: string;
  brand?: string;
  expiration_month?: number;
  expiration_year?: number;
  account_type?: string;
}

export {};