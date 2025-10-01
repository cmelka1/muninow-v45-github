import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrendData {
  monthlyApplications: Array<{
    month: string;
    permits: number;
    licenses: number;
    taxes: number;
    services: number;
    total: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
}

export const useMunicipalTrendData = (customerId: string | undefined, months: number = 12) => {
  return useQuery({
    queryKey: ['municipal-trend-data', customerId, months],
    queryFn: async () => {
      if (!customerId) throw new Error('Customer ID is required');

      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

      // Get applications data
      const [permits, licenses, taxes, services] = await Promise.all([
        supabase
          .from('permit_applications')
          .select('created_at')
          .eq('customer_id', customerId)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('business_license_applications')
          .select('created_at')
          .eq('customer_id', customerId)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('tax_submissions')
          .select('created_at')
          .eq('customer_id', customerId)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('municipal_service_applications')
          .select('created_at')
          .eq('customer_id', customerId)
          .gte('created_at', startDate.toISOString()),
      ]);

      // Get revenue data
      const { data: transactions } = await supabase
        .from('payment_transactions')
        .select('created_at, total_amount_cents')
        .eq('customer_id', customerId)
        .eq('payment_status', 'succeeded')
        .gte('created_at', startDate.toISOString());

      // Generate month labels
      const monthLabels: string[] = [];
      for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
        monthLabels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      }

      // Count applications by month
      const monthlyApplications = monthLabels.map((monthLabel, index) => {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - months + 1 + index, 1);
        const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

        const permitCount = permits.data?.filter(p => {
          const date = new Date(p.created_at);
          return date >= monthDate && date < nextMonth;
        }).length || 0;

        const licenseCount = licenses.data?.filter(l => {
          const date = new Date(l.created_at);
          return date >= monthDate && date < nextMonth;
        }).length || 0;

        const taxCount = taxes.data?.filter(t => {
          const date = new Date(t.created_at);
          return date >= monthDate && date < nextMonth;
        }).length || 0;

        const serviceCount = services.data?.filter(s => {
          const date = new Date(s.created_at);
          return date >= monthDate && date < nextMonth;
        }).length || 0;

        return {
          month: monthLabel,
          permits: permitCount,
          licenses: licenseCount,
          taxes: taxCount,
          services: serviceCount,
          total: permitCount + licenseCount + taxCount + serviceCount,
        };
      });

      // Calculate revenue by month
      const monthlyRevenue = monthLabels.map((monthLabel, index) => {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - months + 1 + index, 1);
        const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

        const revenue = transactions?.filter(t => {
          const date = new Date(t.created_at);
          return date >= monthDate && date < nextMonth;
        }).reduce((sum, t) => sum + (t.total_amount_cents || 0), 0) || 0;

        return {
          month: monthLabel,
          revenue: revenue / 100, // Convert cents to dollars
        };
      });

      return {
        monthlyApplications,
        monthlyRevenue,
      } as TrendData;
    },
    enabled: !!customerId,
  });
};
