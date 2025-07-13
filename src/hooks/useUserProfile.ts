import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserProfile = (userId?: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId || !profile?.customer_id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('customer_id', profile.customer_id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }

      return data;
    },
    enabled: !!(userId && profile?.customer_id && profile?.account_type === 'municipal'),
  });
};