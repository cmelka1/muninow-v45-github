import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface UseUserPaymentHistoryParams extends PaginationParams {
  userId: string;
}

export const useUserPaymentHistory = (params: UseUserPaymentHistoryParams) => {
  const { profile } = useAuth();
  const { userId, page = 1, pageSize = 5 } = params;

  return useQuery({
    queryKey: ['user-payment-history', userId, page, pageSize],
    queryFn: async () => {
      if (!userId || !profile?.customer_id) return { data: [], count: 0 };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: transactions, error, count } = await supabase
        .from('payment_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('customer_id', profile.customer_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching user payment history:', error);
        throw error;
      }

      if (!transactions || transactions.length === 0) {
        return { data: [], count: count || 0 };
      }

      // Get service details for transactions
      const getServiceDetails = async (transaction: any) => {
        let serviceType = 'Unknown';
        let serviceName = 'Unknown Service';

        if (transaction.permit_id) {
          const { data: permit } = await supabase
            .from('permit_applications')
            .select('permit_types_v2(name)')
            .eq('permit_id', transaction.permit_id)
            .single();
          serviceType = 'Building Permit';
          serviceName = (permit as any)?.permit_types_v2?.name || 'Building Permit';
        } else if (transaction.business_license_id) {
          const { data: license } = await supabase
            .from('business_license_applications')
            .select('business_type')
            .eq('id', transaction.business_license_id)
            .single();
          serviceType = 'Business License';
          serviceName = license?.business_type || 'Business License';
        } else if (transaction.service_application_id) {
          const { data: serviceApp } = await supabase
            .from('municipal_service_applications')
            .select('tile_id')
            .eq('id', transaction.service_application_id)
            .single();
          
          if (serviceApp?.tile_id) {
            const { data: tile } = await supabase
              .from('municipal_service_tiles')
              .select('title')
              .eq('id', serviceApp.tile_id)
              .single();
            serviceType = 'Service';
            serviceName = tile?.title || 'Service Application';
          }
        } else if (transaction.tax_submission_id) {
          const { data: tax } = await supabase
            .from('tax_submissions')
            .select('tax_type')
            .eq('id', transaction.tax_submission_id)
            .single();
          serviceType = 'Tax';
          serviceName = tax?.tax_type?.includes('_') 
            ? tax.tax_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            : tax?.tax_type || 'Tax Submission';
        }

        return { serviceType, serviceName };
      };

      // Enrich transactions with service data
      const enrichedData = await Promise.all(
        transactions.map(async (transaction) => {
          const { serviceType, serviceName } = await getServiceDetails(transaction);
          return {
            ...transaction,
            serviceType,
            serviceName,
          };
        })
      );

      return { data: enrichedData, count: count || 0 };
    },
    enabled: !!(
      userId && 
      profile?.customer_id && 
      ['municipal', 'municipaladmin', 'municipaluser'].includes(profile?.account_type || '')
    ),
  });
};