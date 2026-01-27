import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TaxMerchant {
  id: string;
  merchant_name: string;
  business_name: string;
  customer_city: string;
  customer_state: string;
  customer_id: string;
  finix_merchant_id: string;
}

export const useTaxMerchants = (searchTerm: string) => {
  const [merchants, setMerchants] = useState<TaxMerchant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchMerchants = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setMerchants([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: supabaseError } = await supabase
          .from('merchants')
          .select('id, merchant_name, business_name, customer_city, customer_state, customer_id, finix_merchant_id')
          .or(`merchant_name.ilike.%${searchTerm}%,business_name.ilike.%${searchTerm}%`)
          .limit(10);

        if (supabaseError) {
          throw supabaseError;
        }

        setMerchants(data || []);
      } catch (err) {
        console.error('Error searching tax merchants:', err);
        setError(err instanceof Error ? err.message : 'Failed to search merchants');
        setMerchants([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchMerchants, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return { merchants, isLoading, error };
};
