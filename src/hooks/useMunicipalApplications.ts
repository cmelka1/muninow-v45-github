import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ApplicationsBreakdown {
  total: number;
  buildingPermits: number;
  businessLicenses: number;
  businessTaxes: number;
  serviceApplications: number;
}

export const useMunicipalApplications = (customerId: string | undefined) => {
  return useQuery({
    queryKey: ["municipal-applications", customerId],
    queryFn: async (): Promise<ApplicationsBreakdown> => {
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      // Get current month boundaries in UTC for date filtering
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString();
      const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();

      // Get all building permits submitted this month (exclude draft)
      const { count: permitsCount, error: permitsError } = await supabase
        .from("permit_applications")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .neq("application_status", "draft")
        .gte("submitted_at", monthStart)
        .lte("submitted_at", monthEnd);

      if (permitsError) throw permitsError;

      // Get all business licenses submitted this month (exclude draft)
      const { count: licensesCount, error: licensesError } = await supabase
        .from("business_license_applications")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .neq("application_status", "draft")
        .gte("submitted_at", monthStart)
        .lte("submitted_at", monthEnd);

      if (licensesError) throw licensesError;

      // Get all tax submissions this month (exclude draft)
      const { count: taxesCount, error: taxesError } = await supabase
        .from("tax_submissions")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .neq("submission_status", "draft")
        .gte("submission_date", monthStart)
        .lte("submission_date", monthEnd);

      if (taxesError) throw taxesError;

      // Get all service applications submitted this month (exclude draft)
      const { count: servicesCount, error: servicesError } = await supabase
        .from("municipal_service_applications")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .neq("status", "draft")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);

      if (servicesError) throw servicesError;

      return {
        total: (permitsCount || 0) + (licensesCount || 0) + (taxesCount || 0) + (servicesCount || 0),
        buildingPermits: permitsCount || 0,
        businessLicenses: licensesCount || 0,
        businessTaxes: taxesCount || 0,
        serviceApplications: servicesCount || 0,
      };
    },
    enabled: !!customerId,
  });
};
