import { useQueries } from '@tanstack/react-query';
import { useOptimizedPermit } from './useOptimizedPermit';
import { useMunicipalPermitQuestions } from './useMunicipalPermitQuestions';
import { usePermitDocuments } from './usePermitDocuments';

export const useParallelPermitData = (permitId: string) => {
  // Get the main permit data first
  const permitQuery = useOptimizedPermit(permitId);
  
  // Get customer_id from permit data for dependent queries
  const customerId = permitQuery.data?.customer_id;
  const merchantId = permitQuery.data?.merchant_id;

  // Execute all dependent queries in parallel
  const [questionsQuery, documentsQuery] = useQueries({
    queries: [
      {
        queryKey: ['municipal-permit-questions', customerId, merchantId],
        queryFn: async () => {
          if (!customerId) return [];
          
          const { useMunicipalPermitQuestions } = await import('./useMunicipalPermitQuestions');
          // We need to call the hook's queryFn directly since we're inside useQueries
          const { data, error } = await import('@/integrations/supabase/client').then(module => 
            module.supabase.rpc('get_municipal_questions', {
              p_customer_id: customerId,
              p_merchant_id: merchantId || null
            })
          );
          
          if (error) throw error;
          return data || [];
        },
        enabled: !!customerId,
        staleTime: 10 * 60 * 1000, // 10 minutes (questions don't change often)
      },
      {
        queryKey: ['permit-documents', permitId],
        queryFn: async () => {
          if (!permitId) return [];
          
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error } = await supabase
            .from('permit_documents')
            .select('*')
            .eq('permit_id', permitId)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          return data || [];
        },
        enabled: !!permitId,
        staleTime: 2 * 60 * 1000, // 2 minutes
      }
    ]
  });

  return {
    permit: permitQuery,
    questions: questionsQuery,
    documents: documentsQuery,
    isLoading: permitQuery.isLoading || questionsQuery.isLoading || documentsQuery.isLoading,
    isError: permitQuery.isError || questionsQuery.isError || documentsQuery.isError,
    error: permitQuery.error || questionsQuery.error || documentsQuery.error,
  };
};