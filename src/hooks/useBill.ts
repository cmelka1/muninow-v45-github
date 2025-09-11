import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBill = (billId: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['master-bill', billId],
    queryFn: async () => {
      if (!user?.id || !billId) return null;

      let query = supabase
        .from('master_bills')
        .select('*')
        .eq('bill_id', billId);

      // For non-municipal users, filter by user_id
      // Municipal users rely on RLS policies for access control
      const isMunicipal = profile?.account_type && (profile.account_type === 'municipal' || profile.account_type.startsWith('municipal'));
      if (!isMunicipal) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.single();

      if (error) {
        console.error('Error fetching bill:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.id && !!billId,
  });
};