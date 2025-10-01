import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CitizenEngagement {
  newUsersThisMonth: number;
  totalActiveUsers: number;
  applicationCompletionRate: number;
  communicationActivity: {
    comments: number;
    notifications: number;
  };
  topUsers: Array<{
    userId: string;
    userName: string;
    applicationCount: number;
  }>;
}

export const useMunicipalCitizenEngagement = (customerId: string | undefined) => {
  return useQuery({
    queryKey: ['municipal-citizen-engagement', customerId],
    queryFn: async () => {
      if (!customerId) throw new Error('Customer ID is required');

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get all user IDs who have interacted with this customer
      const [permits, licenses, taxes, services] = await Promise.all([
        supabase.from('permit_applications').select('user_id, created_at, application_status').eq('customer_id', customerId),
        supabase.from('business_license_applications').select('user_id, created_at, application_status').eq('customer_id', customerId),
        supabase.from('tax_submissions').select('user_id, created_at, submission_status').eq('customer_id', customerId),
        supabase.from('municipal_service_applications').select('user_id, created_at, status').eq('customer_id', customerId),
      ]);

      // Calculate unique users
      const allUsers = new Set([
        ...(permits.data?.map(p => p.user_id) || []),
        ...(licenses.data?.map(l => l.user_id) || []),
        ...(taxes.data?.map(t => t.user_id) || []),
        ...(services.data?.map(s => s.user_id) || []),
      ]);

      // Calculate new users this month
      const newUsersThisMonth = [
        ...(permits.data || []),
        ...(licenses.data || []),
        ...(taxes.data || []),
        ...(services.data || []),
      ].filter(app => new Date(app.created_at) >= monthStart).length;

      // Calculate completion rate (submitted/total non-draft)
      const totalNonDraft = [
        ...(permits.data?.filter(p => p.application_status !== 'draft') || []),
        ...(licenses.data?.filter(l => l.application_status !== 'draft') || []),
        ...(taxes.data?.filter(t => t.submission_status !== 'draft') || []),
        ...(services.data?.filter(s => s.status !== 'draft') || []),
      ].length;

      const completed = [
        ...(permits.data?.filter(p => ['approved', 'issued'].includes(p.application_status)) || []),
        ...(licenses.data?.filter(l => ['approved', 'issued'].includes(l.application_status)) || []),
        ...(taxes.data?.filter(t => t.submission_status === 'approved') || []),
        ...(services.data?.filter(s => s.status === 'approved') || []),
      ].length;

      const completionRate = totalNonDraft > 0 ? (completed / totalNonDraft) * 100 : 0;

      // Get communication activity counts
      const { count: notificationsCount } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString());

      const commentsCount = 0; // TODO: Add comments count when table exists

      // Calculate top users by application count
      const userApplicationCounts = new Map<string, number>();
      [...(permits.data || []), ...(licenses.data || []), ...(taxes.data || []), ...(services.data || [])].forEach(app => {
        userApplicationCounts.set(app.user_id, (userApplicationCounts.get(app.user_id) || 0) + 1);
      });

      const topUserIds = Array.from(userApplicationCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId]) => userId);

      const { data: topUserProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', topUserIds);

      const topUsers = (topUserProfiles || []).map(profile => ({
        userId: profile.id,
        userName: `${profile.first_name} ${profile.last_name}`,
        applicationCount: userApplicationCounts.get(profile.id) || 0,
      }));

      return {
        newUsersThisMonth,
        totalActiveUsers: allUsers.size,
        applicationCompletionRate: Math.round(completionRate),
        communicationActivity: {
          comments: commentsCount || 0,
          notifications: notificationsCount || 0,
        },
        topUsers,
      } as CitizenEngagement;
    },
    enabled: !!customerId,
  });
};
