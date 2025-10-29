import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentHistoryFilters } from '@/components/PaymentHistoryFilter';

interface PaginationParams {
  page?: number;
  pageSize?: number;
  filters?: PaymentHistoryFilters;
}

export const usePaymentHistory = (params?: PaginationParams) => {
  const { user } = useAuth();
  const { page = 1, pageSize = 5, filters = {} } = params || {};

  return useQuery({
    queryKey: ['payment-history', user?.id, page, pageSize, filters],
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0 };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('payment_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      if (filters.paymentMethod) {
        if (filters.paymentMethod === 'Google Pay') {
          query = query.eq('payment_type', 'GOOGLE_PAY');
        } else if (filters.paymentMethod === 'Apple Pay') {
          query = query.eq('payment_type', 'APPLE_PAY');
        } else if (filters.paymentMethod === 'Bank Account') {
          query = query.eq('payment_type', 'BANK_ACCOUNT');
        } else if (filters.paymentMethod === 'Card') {
          query = query.eq('payment_type', 'PAYMENT_CARD');
        }
      }

      if (filters.paymentDateRange) {
        const now = new Date();
        let startDate: Date;
        
        switch (filters.paymentDateRange) {
          case 'last_7_days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last_30_days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last_90_days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0); // No date filter
        }
        
        if (filters.paymentDateRange !== 'all_time') {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      if (filters.amountRange) {
        switch (filters.amountRange) {
          case '0-100':
            query = query.gte('total_amount_cents', 0).lte('total_amount_cents', 10000);
            break;
          case '101-500':
            query = query.gte('total_amount_cents', 10100).lte('total_amount_cents', 50000);
            break;
          case '501-1000':
            query = query.gte('total_amount_cents', 50100).lte('total_amount_cents', 100000);
            break;
          case '1000+':
            query = query.gte('total_amount_cents', 100001);
            break;
        }
      }

      const { data: transactions, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching payment transactions:', error);
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

      // Apply service type and category filters after enrichment
      let filteredData = enrichedData;
      
      if (filters.serviceType) {
        filteredData = filteredData.filter(t => t.serviceType === filters.serviceType);
      }
      
      if (filters.category) {
        filteredData = filteredData.filter(t => t.serviceName === filters.category);
      }

      return { data: filteredData, count: count || 0 };
    },
    enabled: !!user?.id,
  });
};