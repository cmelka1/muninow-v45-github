export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Formats EIN input as user types (XX-XXXXXXX format)
 */
export const normalizeEINInput = (value: string): string => {
  // Remove all non-digits
  const cleaned = value.replace(/\D/g, '');
  
  // Limit to 9 digits
  const limited = cleaned.slice(0, 9);
  
  // Format as XX-XXXXXXX
  if (limited.length >= 3) {
    return `${limited.slice(0, 2)}-${limited.slice(2)}`;
  } else if (limited.length >= 1) {
    return limited;
  }
  
  return '';
};

/**
 * Validates EIN format and returns validation result
 */
export const validateEIN = (ein: string): { isValid: boolean; error?: string } => {
  if (!ein || ein.trim() === '') {
    return { isValid: false, error: 'EIN is required' };
  }
  
  // Remove all non-digits for validation
  const cleaned = ein.replace(/\D/g, '');
  
  if (cleaned.length !== 9) {
    return { isValid: false, error: 'EIN must be exactly 9 digits' };
  }
  
  return { isValid: true };
};

/**
 * Formats EIN for display (XX-XXXXXXX format)
 */
export const formatEINForDisplay = (ein: string): string => {
  if (!ein) return 'Not provided';
  
  // Remove all non-digits
  const cleaned = ein.replace(/\D/g, '');
  
  // Format as XX-XXXXXXX if we have 9 digits
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
  }
  
  // Return as-is if not 9 digits
  return ein;
};

/**
 * Formats EIN for storage (removes hyphen, keeps only digits)
 */
export const formatEINForStorage = (ein: string): string => {
  return ein.replace(/\D/g, '');
};