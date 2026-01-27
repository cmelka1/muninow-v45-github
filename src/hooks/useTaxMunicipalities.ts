import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TaxMunicipality {
  customer_id: string;
  customer_city: string;
  customer_state: string;
}

export const useTaxMunicipalities = (searchTerm: string) => {
  const [municipalities, setMunicipalities] = useState<TaxMunicipality[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchMunicipalities = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setMunicipalities([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Search merchants by city and get unique customer combinations
        const { data, error: supabaseError } = await supabase
          .from('merchants')
          .select('customer_id, customer_city, customer_state')
          .ilike('customer_city', `%${searchTerm}%`)
          .limit(50);

        if (supabaseError) {
          throw supabaseError;
        }

        // Group by customer_id to get unique municipalities
        const uniqueMunicipalities = new Map<string, TaxMunicipality>();
        
        (data || []).forEach((merchant) => {
          if (merchant.customer_id && merchant.customer_city && merchant.customer_state) {
            if (!uniqueMunicipalities.has(merchant.customer_id)) {
              uniqueMunicipalities.set(merchant.customer_id, {
                customer_id: merchant.customer_id,
                customer_city: merchant.customer_city,
                customer_state: merchant.customer_state,
              });
            }
          }
        });

        setMunicipalities(Array.from(uniqueMunicipalities.values()));
      } catch (err) {
        console.error('Error searching municipalities:', err);
        setError(err instanceof Error ? err.message : 'Failed to search municipalities');
        setMunicipalities([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchMunicipalities, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return { municipalities, isLoading, error };
};
