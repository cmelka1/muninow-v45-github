import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Municipality {
  customer_id: string;
  legal_entity_name: string;
  doing_business_as: string;
  business_city: string;
  business_state: string;
}

export const useMunicipalitySearch = (searchTerm: string, minLength: number = 2) => {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchMunicipalities = async () => {
      if (searchTerm.length < minLength) {
        setMunicipalities([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('customers')
          .select('customer_id, legal_entity_name, doing_business_as, business_city, business_state')
          .ilike('legal_entity_name', `%${searchTerm}%`)
          .order('legal_entity_name')
          .limit(10);

        if (error) throw error;
        setMunicipalities(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to search municipalities');
        setMunicipalities([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchMunicipalities, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, minLength]);

  return { municipalities, isLoading, error };
};