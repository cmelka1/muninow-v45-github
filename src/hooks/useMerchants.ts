import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Merchant {
  id: string;
  merchant_name: string;
  business_name: string;
  verification_status?: string;
  processing_status?: string;
  created_at: string;
  business_address_line1?: string;
  business_address_line2?: string;
  business_city?: string;
  business_state?: string;
  business_zip_code?: string;
  business_country?: string;
  finix_merchant_id?: string | null;
  onboarding_state?: string | null;
  processing_enabled?: boolean | null;
  settlement_enabled?: boolean | null;
  bank_account_holder_name?: string | null;
  bank_masked_account_number?: string | null;
  bank_routing_number?: string | null;
  customer_id: string;
  // Allow additional fields from the database
  [key: string]: unknown;
}

export const useMerchants = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPayoutProfile = async (merchantId: string) => {
    if (!user) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-merchant-payout-profile', {
        body: { merchantId }
      });

      if (error) throw error;

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: "Error",
        description: "Failed to fetch payout profile",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePayoutProfile = async (merchantId: string, profileData: Record<string, unknown>) => {
    if (!user) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('update-merchant-payout-profile', {
        body: { merchantId, profileData }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payout profile updated successfully",
      });

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: "Error",
        description: "Failed to update payout profile",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMerchantsByCustomer = useCallback(async (customerId: string, page = 1, pageSize = 10) => {
    if (!user) return { data: [], count: 0 };
    
    setIsLoading(true);
    setError(null);
    
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from('merchants')
        .select('*', { count: 'exact' })
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setMerchants(data || []);
      return { data: data || [], count: count || 0 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: "Error",
        description: "Failed to fetch merchants",
        variant: "destructive",
      });
      return { data: [], count: 0 };
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const fetchMerchantsByUserId = async (userId: string, page = 1, pageSize = 10) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from('merchants')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setMerchants(data || []);
      return { data: data || [], count: count || 0 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: "Error",
        description: "Failed to fetch merchants",
        variant: "destructive",
      });
      return { data: [], count: 0 };
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMerchantById = async (merchantId: string) => {
    if (!user) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching merchant with ID:', merchantId);
      
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .maybeSingle();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Merchant data:', data);
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('fetchMerchantById error:', err);
      setError(message);
      toast({
        title: "Error",
        description: "Failed to fetch merchant details",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToMerchantChanges = (userId: string, onUpdate: () => void) => {
    const channel = supabase
      .channel('merchant-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'merchants',
          filter: `user_id=eq.${userId}`
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const deleteMerchant = async (merchantId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Check for related records that would block deletion
      const checks = await Promise.all([
        supabase.from('payment_transactions').select('id', { count: 'exact', head: true }).eq('merchant_id', merchantId),
        supabase.from('permit_applications').select('id', { count: 'exact', head: true }).eq('merchant_id', merchantId),
        supabase.from('municipal_service_applications').select('id', { count: 'exact', head: true }).eq('merchant_id', merchantId),
        supabase.from('business_license_applications').select('id', { count: 'exact', head: true }).eq('merchant_id', merchantId),
        supabase.from('merchant_fee_profiles').select('id', { count: 'exact', head: true }).eq('merchant_id', merchantId),
        supabase.from('merchant_payout_profiles').select('id', { count: 'exact', head: true }).eq('merchant_id', merchantId),
      ]);

      const [transactions, permits, services, licenses, feeProfiles, payoutProfiles] = checks;

      // Build error message for blocking records
      const blockingRecords: string[] = [];
      if (transactions.count && transactions.count > 0) blockingRecords.push(`${transactions.count} payment transactions`);
      if (permits.count && permits.count > 0) blockingRecords.push(`${permits.count} permit applications`);
      if (services.count && services.count > 0) blockingRecords.push(`${services.count} service applications`);
      if (licenses.count && licenses.count > 0) blockingRecords.push(`${licenses.count} business license applications`);
      if (feeProfiles.count && feeProfiles.count > 0) blockingRecords.push(`${feeProfiles.count} fee profiles`);
      if (payoutProfiles.count && payoutProfiles.count > 0) blockingRecords.push(`${payoutProfiles.count} payout profiles`);

      if (blockingRecords.length > 0) {
        const errorMsg = `Cannot delete merchant: ${blockingRecords.join(', ')} exist`;
        setError(errorMsg);
        toast({
          title: "Cannot Delete Merchant",
          description: errorMsg,
          variant: "destructive",
        });
        return { success: false, error: errorMsg };
      }

      // Perform deletion
      const { error: deleteError } = await supabase
        .from('merchants')
        .delete()
        .eq('id', merchantId);

      if (deleteError) throw deleteError;

      toast({
        title: "Success",
        description: "Merchant deleted successfully",
      });

      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete merchant';
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    merchants,
    isLoading,
    error,
    fetchMerchantsByCustomer,
    fetchMerchantsByUserId,
    fetchMerchantById,
    subscribeToMerchantChanges,
    fetchPayoutProfile,
    updatePayoutProfile,
    deleteMerchant
  };
};