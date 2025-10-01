import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StatusBreakdown {
  permits: {
    draft: number;
    submitted: number;
    under_review: number;
    information_requested: number;
    approved: number;
    denied: number;
    issued: number;
  };
  licenses: {
    draft: number;
    submitted: number;
    under_review: number;
    information_requested: number;
    approved: number;
    denied: number;
    issued: number;
  };
  taxes: {
    draft: number;
    submitted: number;
    under_review: number;
    approved: number;
    rejected: number;
  };
  services: {
    draft: number;
    submitted: number;
    under_review: number;
    information_requested: number;
    approved: number;
    denied: number;
  };
}

export const useMunicipalStatusBreakdown = (customerId: string | undefined) => {
  return useQuery({
    queryKey: ['municipal-status-breakdown', customerId],
    queryFn: async () => {
      if (!customerId) throw new Error('Customer ID is required');

      // Get permits by status
      const { data: permits, error: permitsError } = await supabase
        .from('permit_applications')
        .select('application_status')
        .eq('customer_id', customerId);

      if (permitsError) throw permitsError;

      // Get licenses by status
      const { data: licenses, error: licensesError } = await supabase
        .from('business_license_applications')
        .select('application_status')
        .eq('customer_id', customerId);

      if (licensesError) throw licensesError;

      // Get taxes by status
      const { data: taxes, error: taxesError } = await supabase
        .from('tax_submissions')
        .select('submission_status')
        .eq('customer_id', customerId);

      if (taxesError) throw taxesError;

      // Get services by status
      const { data: services, error: servicesError } = await supabase
        .from('municipal_service_applications')
        .select('status')
        .eq('customer_id', customerId);

      if (servicesError) throw servicesError;

      // Count permits by status
      const permitCounts = {
        draft: permits?.filter(p => p.application_status === 'draft').length || 0,
        submitted: permits?.filter(p => p.application_status === 'submitted').length || 0,
        under_review: permits?.filter(p => p.application_status === 'under_review').length || 0,
        information_requested: permits?.filter(p => p.application_status === 'information_requested').length || 0,
        approved: permits?.filter(p => p.application_status === 'approved').length || 0,
        denied: permits?.filter(p => p.application_status === 'denied').length || 0,
        issued: permits?.filter(p => p.application_status === 'issued').length || 0,
      };

      // Count licenses by status
      const licenseCounts = {
        draft: licenses?.filter(l => l.application_status === 'draft').length || 0,
        submitted: licenses?.filter(l => l.application_status === 'submitted').length || 0,
        under_review: licenses?.filter(l => l.application_status === 'under_review').length || 0,
        information_requested: licenses?.filter(l => l.application_status === 'information_requested').length || 0,
        approved: licenses?.filter(l => l.application_status === 'approved').length || 0,
        denied: licenses?.filter(l => l.application_status === 'denied').length || 0,
        issued: licenses?.filter(l => l.application_status === 'issued').length || 0,
      };

      // Count taxes by status
      const taxCounts = {
        draft: taxes?.filter(t => t.submission_status === 'draft').length || 0,
        submitted: taxes?.filter(t => t.submission_status === 'submitted').length || 0,
        under_review: taxes?.filter(t => t.submission_status === 'under_review').length || 0,
        approved: taxes?.filter(t => t.submission_status === 'approved').length || 0,
        rejected: taxes?.filter(t => t.submission_status === 'rejected').length || 0,
      };

      // Count services by status
      const serviceCounts = {
        draft: services?.filter(s => s.status === 'draft').length || 0,
        submitted: services?.filter(s => s.status === 'submitted').length || 0,
        under_review: services?.filter(s => s.status === 'under_review').length || 0,
        information_requested: services?.filter(s => s.status === 'information_requested').length || 0,
        approved: services?.filter(s => s.status === 'approved').length || 0,
        denied: services?.filter(s => s.status === 'denied').length || 0,
      };

      return {
        permits: permitCounts,
        licenses: licenseCounts,
        taxes: taxCounts,
        services: serviceCounts,
      } as StatusBreakdown;
    },
    enabled: !!customerId,
  });
};
