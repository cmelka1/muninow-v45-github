import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ServiceApplicationWithTile {
  id: string;
  user_id: string;
  tile_id: string;
  customer_id: string;
  merchant_id?: string;
  form_data: any;
  status: string;
  payment_id?: string;
  payment_status?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
  tile: {
    id: string;
    title: string;
    description?: string;
    amount_cents: number;
    form_fields: any[];
    requires_review: boolean;
    requires_payment: boolean;
    customer_id: string;
    is_active: boolean;
  };
  customer: {
    legal_entity_name: string;
    doing_business_as: string;
    business_city: string;
    business_state: string;
  };
}

export const useServiceApplication = (applicationId: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['service-application', applicationId],
    queryFn: async () => {
      if (!applicationId) return null;

      // Query 1: Get the service application data
      const { data: applicationData, error: applicationError } = await supabase
        .from('municipal_service_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (applicationError) {
        console.error('Error fetching service application:', applicationError);
        throw applicationError;
      }

      // Query 2: Get tile data using tile_id
      let tile = null;
      if (applicationData.tile_id) {
        const { data: tileData, error: tileError } = await supabase
          .from('municipal_service_tiles')
          .select('id, title, description, amount_cents, form_fields, requires_review, requires_payment, customer_id, is_active')
          .eq('id', applicationData.tile_id)
          .single();
        
        if (tileError) {
          console.error('Error fetching tile data:', tileError);
        } else {
          tile = tileData;
        }
      }

      // Query 3: Get customer data using customer_id
      let customer = null;
      if (applicationData.customer_id) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('legal_entity_name, doing_business_as, business_city, business_state')
          .eq('customer_id', applicationData.customer_id)
          .single();
        
        if (customerError) {
          console.error('Error fetching customer data:', customerError);
        } else {
          customer = customerData;
        }
      }

      // Combine all data into the expected structure
      return {
        ...applicationData,
        tile,
        customer,
      } as ServiceApplicationWithTile;
    },
    enabled: !!applicationId,
  });
};