import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TimeSlotConfig {
  slot_duration_minutes?: number;
  start_time_interval_minutes?: number; // Spacing between start times (15, 30, or 60)
  available_days?: string[]; // ['Monday', 'Tuesday', etc.]
  start_time?: string; // '09:00'
  end_time?: string; // '17:00'
  max_advance_days?: number;
  blackout_dates?: string[]; // ['2024-12-25', '2024-01-01']
  timezone?: string; // 'America/New_York'
}

export interface MunicipalServiceTile {
  id: string;
  customer_id: string;
  title: string;
  description?: string;
  guidance_text?: string;
  pdf_form_url?: string;
  amount_cents: number;
  requires_review: boolean;
  requires_payment: boolean;
  requires_document_upload: boolean;
  merchant_id?: string;
  finix_merchant_id?: string;
  merchant_fee_profile_id?: string;
  form_fields: Array<{
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select';
    options?: string[];
    required: boolean;
    placeholder?: string;
  }>;
  auto_populate_user_info: boolean;
  allow_user_defined_amount: boolean;
  is_active: boolean;
  is_renewable: boolean;
  renewal_frequency?: 'annual' | 'quarterly';
  renewal_reminder_days: number;
  auto_renew_enabled: boolean;
  has_time_slots?: boolean;
  booking_mode?: 'time_period' | 'start_time';
  time_slot_config?: TimeSlotConfig;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useMunicipalServiceTiles = (customerId?: string, includeInactive: boolean = false) => {
  return useQuery({
    queryKey: ['municipal-service-tiles', customerId, includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('municipal_service_tiles')
        .select('*');
      
      // Only filter by is_active if not including inactive tiles (for resident view)
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data, error } = await query.order('title', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(tile => ({
        ...tile,
        form_fields: Array.isArray(tile.form_fields) ? tile.form_fields : [],
        time_slot_config: tile.time_slot_config || {}
      })) as unknown as MunicipalServiceTile[];
    },
    enabled: !!customerId,
  });
};

export const useCreateServiceTile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tile: Omit<MunicipalServiceTile, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('municipal_service_tiles')
        .insert(tile as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipal-service-tiles'] });
      toast({
        title: 'Success',
        description: 'Service tile created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create service tile',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateServiceTile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MunicipalServiceTile> & { id: string }) => {
      const { data, error } = await supabase
        .from('municipal_service_tiles')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipal-service-tiles'] });
      toast({
        title: 'Success',
        description: 'Service tile updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update service tile',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteServiceTile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('municipal_service_tiles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipal-service-tiles'] });
      toast({
        title: 'Success',
        description: 'Service tile deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete service tile',
        variant: 'destructive',
      });
    },
  });
};