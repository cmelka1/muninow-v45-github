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

/**
 * Smart abbreviation for filenames that maintains readability
 */
export const smartAbbreviateFilename = (filename: string, maxLength: number = 30): string => {
  if (!filename || filename.length <= maxLength) {
    return filename;
  }

  // Find the last dot to separate name and extension
  const lastDotIndex = filename.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0 && lastDotIndex < filename.length - 1;
  
  if (!hasExtension) {
    // No extension, just truncate with ellipsis
    return filename.slice(0, maxLength - 3) + '...';
  }

  const name = filename.slice(0, lastDotIndex);
  const extension = filename.slice(lastDotIndex);
  
  // Calculate how much space we have for the name part
  const spaceForName = maxLength - extension.length - 3; // 3 for '...'
  
  if (spaceForName <= 6) {
    // Very little space, just show beginning + extension
    return filename.slice(0, 6) + '...' + extension;
  }

  // Split the available space between beginning and end
  const beginLength = Math.ceil(spaceForName * 0.6);
  const endLength = Math.floor(spaceForName * 0.4);
  
  return name.slice(0, beginLength) + '...' + name.slice(-endLength) + extension;
};

/**
 * Formats account type for display (removes "Account" and normalizes casing)
 */
export const formatAccountType = (accountType: string | null | undefined): string => {
  if (!accountType) return 'Unknown';
  
  const type = accountType.toLowerCase();
  
  switch (type) {
    case 'superadmin':
      return 'Super Admin';
    case 'municipaladmin':
      return 'Municipal Admin';
    case 'municipaluser':
      return 'Municipal User';
    case 'residentadmin':
      return 'Resident Admin';
    case 'residentuser':
      return 'Resident User';
    case 'businessadmin':
      return 'Business Admin';
    case 'businessuser':
      return 'Business User';
    default:
      // Fallback for any other types - capitalize first letter
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

/**
 * Gets appropriate badge variant for account type
 */
export const getAccountTypeBadgeVariant = (accountType: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  if (!accountType) return 'outline';
  
  const type = accountType.toLowerCase();
  
  if (type.includes('admin') || type === 'superadmin') {
    return 'destructive'; // Red for admin roles
  } else if (type.includes('municipal')) {
    return 'default'; // Primary for municipal users
  } else if (type.includes('business')) {
    return 'secondary'; // Secondary for business users
  } else {
    return 'outline'; // Outline for resident users and others
  }
};