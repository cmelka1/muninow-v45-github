/**
 * Phone number utilities for MFA verification
 * Matches the normalization logic used for Supabase Auth
 */

/**
 * Formats a phone number for display in the UI
 * Converts E.164 format (+1xxxxxxxxxx) to (xxx) xxx-xxxx
 */
export const formatPhoneForDisplay = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle E.164 format with +1 prefix
  let digits = cleaned;
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    digits = cleaned.substring(1);
  }
  
  // Format as (xxx) xxx-xxxx
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  return phone; // Return original if not a valid US number
};

/**
 * Formats a phone number for storage/API calls
 * Converts display format to E.164 format (+1xxxxxxxxxx)
 */
export const formatPhoneForStorage = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle US phone numbers: remove leading 1 if present
  let digits = cleaned;
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    digits = cleaned.substring(1);
  }
  
  // Validate we have exactly 10 digits for US phone numbers
  if (digits.length !== 10) {
    throw new Error(`Invalid US phone number format. Expected 10 digits, got ${digits.length}`);
  }
  
  // Return E.164 format for US numbers
  return `+1${digits}`;
};

/**
 * Validates a phone number input
 */
export const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
  try {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 0) {
      return { isValid: false, error: 'Phone number is required' };
    }
    
    // Handle US numbers with or without country code
    let digits = cleaned;
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      digits = cleaned.substring(1);
    }
    
    if (digits.length !== 10) {
      return { isValid: false, error: 'Please enter a valid 10-digit US phone number' };
    }
    
    // Check if area code starts with 0 or 1 (invalid)
    if (digits[0] === '0' || digits[0] === '1') {
      return { isValid: false, error: 'Area code cannot start with 0 or 1' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid phone number format' };
  }
};

/**
 * Normalizes phone input as the user types
 * Converts to (xxx) xxx-xxxx format for display
 */
export const normalizePhoneInput = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
};