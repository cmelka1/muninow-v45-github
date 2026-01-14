import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  customer_id: string;
  legal_entity_name: string;
  doing_business_as: string;
  business_city: string;
  business_state: string;
  business_address_line1: string;
  entity_description: string;
  entity_website?: string;
}

export const useCustomerById = (customerId: string | undefined) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!customerId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('customers')
          .select('customer_id, legal_entity_name, doing_business_as, business_city, business_state, business_address_line1, entity_description, entity_website')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (error) throw error;
        setCustomer(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Error fetching customer:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId]);

  return { customer, isLoading, error };
};