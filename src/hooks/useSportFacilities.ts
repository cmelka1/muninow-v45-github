import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MunicipalServiceTile, TimeSlotConfig } from './useMunicipalServiceTiles';

export interface SportFacility extends MunicipalServiceTile {
  has_time_slots: true;
  time_slot_config: TimeSlotConfig;
}

export const useSportFacilities = (customerId?: string) => {
  return useQuery({
    queryKey: ['sport-facilities', customerId],
    queryFn: async () => {
      let query = supabase
        .from('municipal_service_tiles')
        .select('*')
        .eq('has_time_slots', true);
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(tile => ({
        ...tile,
        form_fields: Array.isArray(tile.form_fields) ? tile.form_fields : [],
        time_slot_config: tile.time_slot_config || {}
      })) as unknown as SportFacility[];
    },
    enabled: !!customerId,
  });
};

export const useActiveSportFacilities = (customerId?: string) => {
  return useQuery({
    queryKey: ['active-sport-facilities', customerId],
    queryFn: async () => {
      let query = supabase
        .from('municipal_service_tiles')
        .select('*')
        .eq('has_time_slots', true)
        .eq('is_active', true);
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data, error } = await query.order('title', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(tile => ({
        ...tile,
        form_fields: Array.isArray(tile.form_fields) ? tile.form_fields : [],
        time_slot_config: tile.time_slot_config || {}
      })) as unknown as SportFacility[];
    },
    enabled: !!customerId,
  });
};

export const useCreateSportFacility = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (facility: Omit<SportFacility, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('municipal_service_tiles')
        .insert({
          ...facility,
          has_time_slots: true, // Always true for sport facilities
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sport-facilities'] });
      queryClient.invalidateQueries({ queryKey: ['active-sport-facilities'] });
      queryClient.invalidateQueries({ queryKey: ['municipal-service-tiles'] });
      toast({
        title: 'Success',
        description: 'Sport facility created successfully',
      });
    },
    onError: (error) => {
      console.error('Error creating sport facility:', error);
      toast({
        title: 'Error',
        description: 'Failed to create sport facility',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSportFacility = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SportFacility> & { id: string }) => {
      const { data, error } = await supabase
        .from('municipal_service_tiles')
        .update({
          ...updates,
          has_time_slots: true, // Ensure it stays true
        } as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sport-facilities'] });
      queryClient.invalidateQueries({ queryKey: ['active-sport-facilities'] });
      queryClient.invalidateQueries({ queryKey: ['municipal-service-tiles'] });
      toast({
        title: 'Success',
        description: 'Sport facility updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating sport facility:', error);
      toast({
        title: 'Error',
        description: 'Failed to update sport facility',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteSportFacility = () => {
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
      queryClient.invalidateQueries({ queryKey: ['sport-facilities'] });
      queryClient.invalidateQueries({ queryKey: ['active-sport-facilities'] });
      queryClient.invalidateQueries({ queryKey: ['municipal-service-tiles'] });
      toast({
        title: 'Success',
        description: 'Sport facility deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Error deleting sport facility:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete sport facility',
        variant: 'destructive',
      });
    },
  });
};
