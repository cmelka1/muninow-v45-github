import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Customer {
  customer_id: string;
  legal_entity_name: string;
  doing_business_as: string;
  business_city: string;
  business_state: string;
  business_address_line1: string;
  entity_description: string;
}

export const useCustomer = () => {
  const { profile } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!profile?.customer_id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('customers')
          .select('customer_id, legal_entity_name, doing_business_as, business_city, business_state, business_address_line1, entity_description')
          .eq('customer_id', profile.customer_id)
          .maybeSingle();

        if (error) throw error;
        setCustomer(data);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching customer:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [profile?.customer_id]);

  return { customer, isLoading, error };
};