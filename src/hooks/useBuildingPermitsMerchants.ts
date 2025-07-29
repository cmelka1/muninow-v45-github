import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BuildingPermitsMerchant {
  id: string;
  merchant_name: string;
  business_name: string;
  customer_city: string;
  customer_state: string;
}

export const useBuildingPermitsMerchants = (searchTerm: string) => {
  const [merchants, setMerchants] = useState<BuildingPermitsMerchant[]>([]);
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
          .select('id, merchant_name, business_name, customer_city, customer_state')
          .eq('subcategory', 'Building Permits')
          .ilike('merchant_name', `%${searchTerm}%`)
          .limit(10);

        if (supabaseError) {
          throw supabaseError;
        }

        setMerchants(data || []);
      } catch (err) {
        console.error('Error searching building permits merchants:', err);
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