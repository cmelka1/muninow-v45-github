import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Merchant {
  id: string;
  merchant_name: string;
  business_name: string;
  verification_status: string;
  processing_status: string;
  created_at: string;
  business_address_line1: string;
  business_address_line2?: string;
  business_city: string;
  business_state: string;
  business_zip_code: string;
  business_country: string;
  finix_merchant_id: string | null;
  onboarding_state: string | null;
  processing_enabled: boolean | null;
  settlement_enabled: boolean | null;
  bank_account_holder_name: string | null;
  bank_masked_account_number: string | null;
  bank_routing_number: string | null;
  customer_id: string;
}

export const useMerchants = () => {
  const [merchants, setMerchants] = useState<any[]>([]);
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
    } catch (err: any) {
      setError(err.message);
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

  const updatePayoutProfile = async (merchantId: string, profileData: any) => {
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
    } catch (err: any) {
      setError(err.message);
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

  const fetchMerchantsByCustomer = async (customerId: string, page = 1, pageSize = 10) => {
    if (!user) {
      console.log('No user found, cannot fetch merchants');
      return { data: [], count: 0 };
    }
    
    console.log('Fetching merchants for customer ID:', customerId);
    setIsLoading(true);
    setError(null);
    
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Directly fetch merchants by customer_id
      const { data, error, count } = await supabase
        .from('merchants')
        .select('*', { count: 'exact' })
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Supabase error fetching merchants:', error);
        throw error;
      }

      console.log('Successfully fetched merchants:', data?.length || 0, 'merchants found');
      console.log('Merchants data:', data);
      
      setMerchants(data || []);
      return { data: data || [], count: count || 0 };
    } catch (err: any) {
      console.error('Error in fetchMerchantsByCustomer:', err);
      setError(err.message);
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
    } catch (err: any) {
      setError(err.message);
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
    } catch (err: any) {
      console.error('fetchMerchantById error:', err);
      setError(err.message);
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

  return {
    merchants,
    isLoading,
    error,
    fetchMerchantsByCustomer,
    fetchMerchantsByUserId,
    fetchMerchantById,
    subscribeToMerchantChanges,
    fetchPayoutProfile,
    updatePayoutProfile
  };
};