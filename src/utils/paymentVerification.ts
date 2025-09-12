import { supabase } from '@/integrations/supabase/client';

export interface PaymentVerificationResult {
  isVerified: boolean;
  status?: string;
  error?: string;
}

/**
 * Verifies payment status by checking the database after a potential backend success
 * Adds retry logic to handle timing issues where response arrives before database update
 */
export const verifyPaymentInDatabase = async (
  entityType: 'permit' | 'business_license' | 'service_application' | 'tax_submission',
  entityId: string,
  maxRetries = 3,
  delayMs = 2000
): Promise<PaymentVerificationResult> => {
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Payment verification attempt ${attempt}/${maxRetries} for ${entityType} ${entityId}`);
      
      // Wait before checking (except first attempt)
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      let data: any = null;
      let error: any = null;

      // Use explicit type assertions to avoid TypeScript issues
      try {
        if (entityType === 'permit') {
          const result = await (supabase as any)
            .from('permit_applications')
            .select('status, payment_status')
            .eq('permit_id', entityId)
            .limit(1);
          data = result.data?.[0] || null;
          error = result.error;
        } else if (entityType === 'business_license') {
          const result = await (supabase as any)
            .from('business_license_applications') 
            .select('status, payment_status')
            .eq('license_id', entityId)
            .limit(1);
          data = result.data?.[0] || null;
          error = result.error;
        } else if (entityType === 'tax_submission') {
          const result = await (supabase as any)
            .from('tax_submissions')
            .select('payment_status')
            .eq('submission_id', entityId)
            .limit(1);
          data = result.data?.[0] || null;
          error = result.error;
        } else {
          return { isVerified: false, error: `Unsupported entity type: ${entityType}` };
        }
      } catch (queryError) {
        error = queryError;
      }

      if (error) {
        console.error(`❌ Database verification error (attempt ${attempt}):`, error);
        if (attempt === maxRetries) {
          return { isVerified: false, error: error.message };
        }
        continue;
      }

      if (!data) {
        console.log(`⚠️ No data found for ${entityType} ${entityId} (attempt ${attempt})`);
        if (attempt === maxRetries) {
          return { isVerified: false, error: 'Entity not found' };
        }
        continue;
      }

      // Check for successful payment status
      const paymentStatus = data.payment_status;
      const entityStatus = data.status;
      
      const isPaymentSuccessful = paymentStatus === 'paid' || 
                                 paymentStatus === 'completed' ||
                                 entityStatus === 'issued' || 
                                 entityStatus === 'approved';

      console.log(`📊 Database verification result (attempt ${attempt}):`, {
        entityType,
        entityId,
        paymentStatus,
        entityStatus,
        isPaymentSuccessful
      });

      if (isPaymentSuccessful) {
        return { 
          isVerified: true, 
          status: paymentStatus || entityStatus 
        };
      }

      // If not successful and this is the last attempt, return failure
      if (attempt === maxRetries) {
        return { 
          isVerified: false, 
          status: paymentStatus || entityStatus,
          error: 'Payment not confirmed in database after retries'
        };
      }

    } catch (err) {
      console.error(`💥 Verification attempt ${attempt} failed:`, err);
      if (attempt === maxRetries) {
        return { isVerified: false, error: 'Database verification failed' };
      }
    }
  }

  return { isVerified: false, error: 'Verification failed after all retries' };
};