/**
 * Type definitions for Supabase RPC responses and custom queries.
 * These interfaces provide type safety for data returned by database functions.
 */

// ============================================================================
// User & Authentication RPCs
// ============================================================================

/**
 * Response from `check_customer_admin_exists` RPC
 */
export interface CustomerAdminExistsResponse {
  exists: boolean;
}

// ============================================================================
// Permit & License RPCs
// ============================================================================

/**
 * Response from permit renewal RPC
 */
export interface PermitRenewalResponse {
  success: boolean;
  new_permit_id?: string;
  error?: string;
}

/**
 * Response from business license renewal RPC
 */
export interface BusinessLicenseRenewalResponse {
  success: boolean;
  new_license_id?: string;
  error?: string;
}

/**
 * Response from service application renewal RPC
 */
export interface ServiceApplicationRenewalResponse {
  success: boolean;
  new_application_id?: string;
  error?: string;
}

// ============================================================================
// Address & Validation RPCs
// ============================================================================

/**
 * Response from address validation Edge Function
 */
export interface AddressValidationResponse {
  valid: boolean;
  normalized_address?: string;
  zone_id?: string;
  error?: string;
}

/**
 * Google Maps Places API suggestion
 */
export interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

/**
 * Google Maps address component
 */
export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

// ============================================================================
// Payment & Fee RPCs
// ============================================================================

/**
 * Response from `calculate-service-fee` Edge Function
 */
export interface ServiceFeeResponse {
  success: boolean;
  serviceFee: number;
  totalAmount: number;
  basisPoints: number;
  isCard: boolean;
  error?: string;
}

/**
 * Response from unified payment transaction RPC
 */
export interface PaymentTransactionResponse {
  success: boolean;
  transaction_id?: string;
  service_fee_cents?: number;
  total_amount_cents?: number;
  basis_points?: number;
  error?: string;
  error_code?: string;
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Entity details attached to notifications
 * Includes index signature for Supabase Json compatibility
 */
export interface NotificationEntityDetails {
  entity_type?: string;
  entity_id?: string;
  title?: string;
  description?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Payment details attached to notifications
 * Includes index signature for Supabase Json compatibility
 */
export interface NotificationPaymentDetails {
  amount_cents?: number;
  payment_type?: string;
  transaction_id?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Communication details attached to notifications
 * Includes index signature for Supabase Json compatibility
 */
export interface NotificationCommunicationDetails {
  sender_name?: string;
  sender_email?: string;
  message_preview?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// ============================================================================
// Form & Dynamic Data Types
// ============================================================================

/**
 * Generic form responses stored in JSONB fields
 * Use this for `form_responses` and similar dynamic fields
 */
export type FormResponses = Record<string, unknown>;

/**
 * Inspection form structure (JSONB schema)
 */
export interface InspectionFormStructure {
  sections?: Array<{
    id: string;
    title: string;
    fields: Array<{
      id: string;
      type: string;
      label: string;
      required?: boolean;
      options?: string[];
    }>;
  }>;
  version?: number;
}

/**
 * Question options for permit questions
 * Includes index signature for Supabase Json compatibility
 */
export interface QuestionOptions {
  choices?: string[];
  min_value?: number;
  max_value?: number;
  placeholder?: string;
  validation_regex?: string;
  [key: string]: string | number | boolean | null | undefined | string[];
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Generic error response structure
 */
export interface ErrorResponse {
  success: false;
  error: string;
  error_code?: string;
  details?: Record<string, unknown>;
}

/**
 * Type guard to check if a value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Safely extract error message from unknown catch parameter
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "An unknown error occurred";
}
