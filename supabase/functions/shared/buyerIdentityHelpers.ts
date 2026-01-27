/**
 * Buyer Identity Helper Functions
 * Centralized utilities for fetching user's Finix Buyer Identity
 * 
 * IMPORTANT: Buyer identities are created during user signup via the
 * finix-create-identity Edge function and stored in the finix_identities table.
 * These are distinct from merchant identities stored in the customers table.
 */

import { Logger } from './logger.ts';

/**
 * Fetches the user's Finix Buyer Identity from the finix_identities table.
 * This identity is created during user signup via the finix-create-identity Edge function.
 * 
 * @param supabase - Supabase client instance
 * @param userId - The user's auth.users.id
 * @returns The Finix Identity ID or null if not found
 */
export async function fetchBuyerIdentity(
  supabase: any,
  userId: string
): Promise<string | null> {
  Logger.info('[fetchBuyerIdentity] Looking up identity for user', { userId });

  const { data, error } = await supabase
    .from('finix_identities')
    .select('finix_identity_id')
    .eq('user_id', userId)
    .single();

  if (error || !data?.finix_identity_id) {
    Logger.error('[fetchBuyerIdentity] Identity not found', { userId, error });
    return null;
  }

  Logger.info('[fetchBuyerIdentity] Found identity', { 
    userId, 
    identityId: data.finix_identity_id 
  });
  
  return data.finix_identity_id;
}

/**
 * Fetches buyer identity with strict error handling.
 * Throws a descriptive error if identity is not found.
 * 
 * Use this when an identity MUST exist (e.g., adding payment methods).
 * Do NOT create identities on-the-fly - they must be created during signup.
 */
export async function requireBuyerIdentity(
  supabase: any,
  userId: string
): Promise<string> {
  const identityId = await fetchBuyerIdentity(supabase, userId);
  
  if (!identityId) {
    throw new Error(
      'Payment identity not found. Please complete account setup or contact support.'
    );
  }
  
  return identityId;
}
