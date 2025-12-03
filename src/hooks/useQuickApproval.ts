import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ApprovalParams {
  applicationId: string;
  action: 'approve' | 'deny' | 'request_info';
  reason?: string;
  message?: string;
}

export const useQuickApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, action, reason, message }: ApprovalParams) => {
      const updates: any = {};

      if (action === 'approve') {
        updates.status = 'approved';
        updates.approved_at = new Date().toISOString();
      } else if (action === 'deny') {
        if (!reason) throw new Error('Reason required for denial');
        updates.status = 'denied';
        updates.denied_at = new Date().toISOString();
        updates.denial_reason = reason;
      } else if (action === 'request_info') {
        if (!message) throw new Error('Message required for info request');
        updates.status = 'information_requested';
        updates.information_requested_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('municipal_service_applications')
        .update(updates)
        .eq('id', applicationId);

      if (error) throw error;

      // If requesting info or denying, create a comment
      if ((action === 'request_info' || action === 'deny') && (message || reason)) {
        const { data: profile } = await supabase.auth.getUser();
        if (profile.user) {
          await supabase
            .from('municipal_service_application_comments')
            .insert({
              application_id: applicationId,
              comment_text: message || reason || '',
              reviewer_id: profile.user.id,
              is_internal: false,
            });
        }
      }

      return { applicationId, action };
    },
    onSuccess: (_, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['daily-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['service-applications'] });
      queryClient.invalidateQueries({ queryKey: ['sport-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booked-time-slots'] });
      queryClient.invalidateQueries({ queryKey: ['conflict-check'] });

      const actionText = variables.action === 'approve' ? 'approved' : 
                        variables.action === 'deny' ? 'denied' : 
                        'updated';
      
      toast({
        title: 'Success',
        description: `Booking ${actionText} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update booking',
        variant: 'destructive',
      });
    },
  });
};
