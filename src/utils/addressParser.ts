/**
 * Address Parser Utility
 * Provides fallback parsing for manually-typed addresses
 */

interface ParsedAddress {
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

/**
 * Attempts to parse a US address string into components
 * Format: "123 Main St, City, ST 12345"
 * Also handles: "123 Main St, City, ST" or "123 Main St, City"
 */
export function parseAddressString(addressString: string): ParsedAddress {
  if (!addressString || typeof addressString !== 'string') {
    return {};
  }

  const trimmed = addressString.trim();
  const parts = trimmed.split(',').map(part => part.trim());

  if (parts.length < 2) {
    return {};
  }

  const result: ParsedAddress = {};

  // First part is likely the street address
  result.street_address = parts[0];

  // Handle 4-part addresses: "Street, City, State, Zip"
  if (parts.length === 4) {
    const potentialZip = parts[3];
    const potentialState = parts[2];
    
    if (/^\d{5}$/.test(potentialZip) && /^[A-Z]{2}$/.test(potentialState)) {
      result.city = parts[1];
      result.state = potentialState;
      result.zip_code = potentialZip;
      return result;
    }
  }

  // Last part might contain state and zip
  const lastPart = parts[parts.length - 1];
  
  // Try to extract state and zip from the last part (e.g., "NJ 08701" or "NJ")
  const stateZipMatch = lastPart.match(/^([A-Z]{2})\s*(\d{5})?$/);
  
  if (stateZipMatch) {
    result.state = stateZipMatch[1];
    if (stateZipMatch[2]) {
      result.zip_code = stateZipMatch[2];
    }
    
    // City is the part before the last part
    if (parts.length > 2) {
      result.city = parts[parts.length - 2];
    }
  } else {
    // If no state/zip pattern found, assume format is "Street, City"
    // or the city might contain the state and zip
    result.city = lastPart;
    
    // Try to extract zip code from city string (e.g., "Lakewood NJ 08701")
    const cityWithZipMatch = result.city.match(/^(.+?)\s+([A-Z]{2})\s+(\d{5})$/);
    if (cityWithZipMatch) {
      result.city = cityWithZipMatch[1];
      result.state = cityWithZipMatch[2];
      result.zip_code = cityWithZipMatch[3];
    } else {
      // Try to extract just state from city (e.g., "Lakewood NJ")
      const cityWithStateMatch = result.city.match(/^(.+?)\s+([A-Z]{2})$/);
      if (cityWithStateMatch) {
        result.city = cityWithStateMatch[1];
        result.state = cityWithStateMatch[2];
      }
    }
  }

  return result;
}

/**
 * Enriches form data with parsed address components if they are missing
 * Only attempts parsing if there's an address string but missing components
 */
export function enrichFormDataWithParsedAddress(
  formData: Record<string, any>
): Record<string, any> {
  // Find address field (could be 'address', 'street_address', etc.)
  const addressField = Object.keys(formData).find(key => 
    ['address', 'street_address', 'property_address'].includes(key.toLowerCase())
  );

  if (!addressField) {
    return formData;
  }

  const addressValue = formData[addressField];
  
  // Only parse if we have an address string but missing city/state/zip
  const needsParsing = addressValue && 
    (!formData.city || !formData.state || !formData.zip_code);

  if (!needsParsing) {
    return formData;
  }

  const parsed = parseAddressString(addressValue);
  
  return {
    ...formData,
    // Only fill in missing fields, don't overwrite existing ones
    // Use only the parsed street portion, not the full address string
    street_address: formData.street_address || parsed.street_address,
    city: formData.city || parsed.city,
    state: formData.state || parsed.state,
    zip_code: formData.zip_code || parsed.zip_code,
  };
}
