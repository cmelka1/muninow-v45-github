interface GuestUserParams {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  billingAddress?: {
    address1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
}

interface GuestUserResult {
  userId: string;
  finixIdentityId: string;
  isNew: boolean;
  error?: string;
}

/**
 * Creates a guest user account with Finix BUYER identity for checkout
 * Follows Finix documentation for creating Personal/Buyer identities
 */
export async function createGuestUser(
  params: GuestUserParams,
  supabase: any
): Promise<Omit<GuestUserResult, 'isNew'>> {
  try {
    // Generate a temporary email if none provided
    const guestEmail = params.email || `guest-${crypto.randomUUID()}@muninow.guest`;
    
    console.log('[createGuestUser] Creating guest user with email:', guestEmail);

    // Create a temporary auth user with random password
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: guestEmail,
      password: crypto.randomUUID(), // Random password they can't use
      email_confirm: true, // Auto-confirm for guests
      user_metadata: {
        is_guest: true,
        created_via: 'apple_pay_checkout'
      }
    });

    if (authError || !authData.user) {
      console.error('[createGuestUser] Auth user creation failed:', authError);
      return { 
        userId: '', 
        finixIdentityId: '',
        error: `Failed to create guest auth user: ${authError?.message}` 
      };
    }

    const userId = authData.user.id;
    console.log('[createGuestUser] Auth user created:', userId);

    // Create profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: guestEmail,
        first_name: params.firstName || 'Guest',
        last_name: params.lastName || 'User',
        phone: params.phone,
        street_address: params.billingAddress?.address1,
        city: params.billingAddress?.city,
        state: params.billingAddress?.state,
        zip_code: params.billingAddress?.postal_code,
        account_type: 'residentuser',
        is_guest: true
      });

    if (profileError) {
      console.error('[createGuestUser] Profile creation failed:', profileError);
      // Continue anyway - profile trigger might have created it
    } else {
      console.log('[createGuestUser] Profile created successfully');
    }

    // Create Finix BUYER identity via edge function
    console.log('[createGuestUser] Creating Finix BUYER identity...');
    
    const { data: finixData, error: finixError } = await supabase.functions.invoke(
      'create-finix-buyer-identity',
      {
        body: {
          user_id: userId,
          email: guestEmail,
          first_name: params.firstName || 'Guest',
          last_name: params.lastName || 'User',
          phone: params.phone,
          address: params.billingAddress ? {
            line1: params.billingAddress.address1,
            city: params.billingAddress.city,
            region: params.billingAddress.state,
            postal_code: params.billingAddress.postal_code,
            country: 'USA'
          } : undefined
        }
      }
    );

    if (finixError || !finixData?.identity_id) {
      console.error('[createGuestUser] Finix identity creation failed:', finixError);
      return {
        userId,
        finixIdentityId: '',
        error: `Failed to create Finix identity: ${finixError?.message || finixData?.error}`
      };
    }

    console.log('[createGuestUser] Finix BUYER identity created:', finixData.identity_id);

    return {
      userId,
      finixIdentityId: finixData.identity_id
    };

  } catch (error) {
    console.error('[createGuestUser] Unexpected error:', error);
    return {
      userId: '',
      finixIdentityId: '',
      error: `Guest user creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Gets an existing user's Finix identity or creates a new guest user
 */
export async function getOrCreateGuestUser(
  params: GuestUserParams,
  supabase: any,
  existingUserId?: string
): Promise<GuestUserResult> {
  
  // If we have an existing user, fetch their identity
  if (existingUserId) {
    console.log('[getOrCreateGuestUser] Checking existing user:', existingUserId);
    
    const { data: identity } = await supabase
      .from('finix_identities')
      .select('finix_identity_id')
      .eq('user_id', existingUserId)
      .eq('identity_type', 'BUYER')
      .single();

    if (identity?.finix_identity_id) {
      console.log('[getOrCreateGuestUser] Found existing BUYER identity:', identity.finix_identity_id);
      return {
        userId: existingUserId,
        finixIdentityId: identity.finix_identity_id,
        isNew: false
      };
    }
  }

  // Create new guest user
  console.log('[getOrCreateGuestUser] Creating new guest user');
  const result = await createGuestUser(params, supabase);
  return { ...result, isNew: true };
}
