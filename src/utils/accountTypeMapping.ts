// Account type mapping utilities for Finix identity resolution

/**
 * Maps detailed account types from profiles table to simplified types used in finix_identities table
 * 
 * @param accountType - The detailed account type from profiles table
 * @returns Simplified account type for finix_identities table
 */
export function mapAccountTypeForFinix(accountType: string): string {
  const mapping: Record<string, string> = {
    'residentadmin': 'resident',
    'residentuser': 'resident',
    'businessadmin': 'business', 
    'businessuser': 'business',
    'municipaladmin': 'municipal',
    'municipaluser': 'municipal',
    'superadmin': 'business' // Default fallback for super admin
  };
  
  const mappedType = mapping[accountType?.toLowerCase()];
  
  // Log mapping for debugging
  if (accountType && mappedType) {
    console.log(`Account type mapping: ${accountType} → ${mappedType}`);
  } else if (accountType) {
    console.warn(`Unknown account type: ${accountType}, defaulting to 'resident'`);
  }
  
  return mappedType || 'resident'; // Default fallback
}

/**
 * Maps simplified account types back to detailed types (reverse mapping)
 * Used when creating new finix identities to determine appropriate detailed type
 * 
 * @param simplifiedType - The simplified account type
 * @param isAdmin - Whether the user should be an admin type
 * @returns Detailed account type
 */
export function mapSimplifiedToDetailedAccountType(simplifiedType: string, isAdmin: boolean = true): string {
  const mapping: Record<string, { admin: string; user: string }> = {
    'resident': { admin: 'residentadmin', user: 'residentuser' },
    'business': { admin: 'businessadmin', user: 'businessuser' },
    'municipal': { admin: 'municipaladmin', user: 'municipaluser' }
  };
  
  const typeMapping = mapping[simplifiedType?.toLowerCase()];
  return typeMapping ? (isAdmin ? typeMapping.admin : typeMapping.user) : 'residentadmin';
}