import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BusinessLicenseType {
  id: string;
  name: string;
  description: string;
  base_fee_cents: number;
  processing_days: number;
  requires_inspection: boolean;
  is_active: boolean;
  customer_id: string;
  created_at: string;
  updated_at: string;
}

interface UseBusinessLicenseTypesParams {
  customerId?: string;
}

export const useBusinessLicenseTypes = ({ customerId }: UseBusinessLicenseTypesParams = {}) => {
  return useQuery({
    queryKey: ['business-license-types', customerId],
    queryFn: async () => {
      let query = supabase
        .from('business_license_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Sort business types with "Other" always last
      const sortedData = data?.sort((a, b) => {
        if (a.name.toLowerCase() === 'other') return 1;
        if (b.name.toLowerCase() === 'other') return -1;
        return a.name.localeCompare(b.name);
      });

      return sortedData as BusinessLicenseType[];
    },
    enabled: true,
  });
};