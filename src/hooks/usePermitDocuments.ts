import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PermitDocument {
  id: string;
  permit_id: string;
  user_id: string;
  customer_id: string;
  merchant_id: string;
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

export const usePermitDocuments = (permitId: string) => {
  return useQuery({
    queryKey: ['permit_documents', permitId],
    queryFn: async () => {
      if (!permitId) return [];
      
      const { data, error } = await supabase
        .from('permit_documents')
        .select('*')
        .eq('permit_id', permitId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching permit documents:', error);
        throw error;
      }

      return data as PermitDocument[];
    },
    enabled: !!permitId,
  });
};