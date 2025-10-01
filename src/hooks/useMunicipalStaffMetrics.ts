import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StaffMetrics {
  reviewQueue: {
    permits: number;
    licenses: number;
    services: number;
    total: number;
  };
  staffWorkload: Array<{
    staffId: string;
    staffName: string;
    assignedCount: number;
    completedThisMonth: number;
    avgResponseTime: number;
  }>;
  totalStaff: number;
}

export const useMunicipalStaffMetrics = (customerId: string | undefined) => {
  return useQuery({
    queryKey: ['municipal-staff-metrics', customerId],
    queryFn: async () => {
      if (!customerId) throw new Error('Customer ID is required');

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get pending review counts
      const [
        { count: permitQueue },
        { count: licenseQueue },
        { count: serviceQueue },
      ] = await Promise.all([
        supabase
          .from('permit_applications')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .in('application_status', ['submitted', 'under_review', 'information_requested']),
        supabase
          .from('business_license_applications')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .in('application_status', ['submitted', 'under_review', 'information_requested']),
        supabase
          .from('municipal_service_applications')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .in('status', ['submitted', 'under_review', 'information_requested']),
      ]);

      // Get staff workload data
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('customer_id', customerId)
        .in('account_type', ['municipal', 'municipaladmin', 'municipaluser']);

      const staffWorkload = await Promise.all(
        (staffProfiles || []).map(async (staff) => {
          // Count assigned applications
          const [
            { count: assignedPermits },
            { count: assignedLicenses },
            { count: assignedServices },
          ] = await Promise.all([
            supabase
              .from('permit_applications')
              .select('*', { count: 'exact', head: true })
              .eq('assigned_reviewer_id', staff.id)
              .in('application_status', ['submitted', 'under_review', 'information_requested']),
            supabase
              .from('business_license_applications')
              .select('*', { count: 'exact', head: true })
              .eq('assigned_reviewer_id', staff.id)
              .in('application_status', ['submitted', 'under_review', 'information_requested']),
            supabase
              .from('municipal_service_applications')
              .select('*', { count: 'exact', head: true })
              .eq('assigned_reviewer_id', staff.id)
              .in('status', ['submitted', 'under_review', 'information_requested']),
          ]);

          // Count completed this month
          const [
            { count: completedPermits },
            { count: completedLicenses },
            { count: completedServices },
          ] = await Promise.all([
            supabase
              .from('permit_applications')
              .select('*', { count: 'exact', head: true })
              .eq('assigned_reviewer_id', staff.id)
              .in('application_status', ['approved', 'denied', 'issued'])
              .gte('updated_at', monthStart.toISOString()),
            supabase
              .from('business_license_applications')
              .select('*', { count: 'exact', head: true })
              .eq('assigned_reviewer_id', staff.id)
              .in('application_status', ['approved', 'denied', 'issued'])
              .gte('updated_at', monthStart.toISOString()),
            supabase
              .from('municipal_service_applications')
              .select('*', { count: 'exact', head: true })
              .eq('assigned_reviewer_id', staff.id)
              .in('status', ['approved', 'denied'])
              .gte('updated_at', monthStart.toISOString()),
          ]);

          return {
            staffId: staff.id,
            staffName: `${staff.first_name} ${staff.last_name}`,
            assignedCount: (assignedPermits || 0) + (assignedLicenses || 0) + (assignedServices || 0),
            completedThisMonth: (completedPermits || 0) + (completedLicenses || 0) + (completedServices || 0),
            avgResponseTime: 0, // TODO: Calculate from status change timestamps
          };
        })
      );

      return {
        reviewQueue: {
          permits: permitQueue || 0,
          licenses: licenseQueue || 0,
          services: serviceQueue || 0,
          total: (permitQueue || 0) + (licenseQueue || 0) + (serviceQueue || 0),
        },
        staffWorkload: staffWorkload.sort((a, b) => b.assignedCount - a.assignedCount),
        totalStaff: staffProfiles?.length || 0,
      } as StaffMetrics;
    },
    enabled: !!customerId,
  });
};
