import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BusinessLicenseDocument {
  id: string;
  license_id: string;
  user_id: string;
  customer_id: string;
  merchant_id: string | null;
  merchant_name: string | null;
  file_name: string;
  document_type: string;
  description: string | null;
  storage_path: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export const useBusinessLicenseDocumentsList = (licenseId: string) => {
  return useQuery({
    queryKey: ['business-license-documents', licenseId],
    queryFn: async () => {
      if (!licenseId) return [];
      
      const { data, error } = await supabase
        .from('business_license_documents')
        .select('*')
        .eq('license_id', licenseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching business license documents:', error);
        throw error;
      }

      return data as BusinessLicenseDocument[];
    },
    enabled: !!licenseId,
  });
};