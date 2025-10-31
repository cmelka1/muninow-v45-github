import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ApplicationsBreakdown {
  total: number;
  buildingPermits: number;
  businessLicenses: number;
  businessTaxes: number;
  serviceApplications: number;
}

export type Period = "last_7_days" | "last_30_days" | "last_3_months" | "last_6_months" | "this_year";

const getPeriodDates = (period: Period) => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date();

  switch (period) {
    case "last_7_days":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last_30_days":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "last_3_months":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "last_6_months":
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case "this_year":
      startDate = new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59, 999));
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
};

export const useMunicipalApplications = (customerId: string | undefined, period: Period = "last_7_days") => {
  return useQuery({
    queryKey: ["municipal-applications", customerId, period],
    queryFn: async (): Promise<ApplicationsBreakdown> => {
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      const { startDate: monthStart, endDate: monthEnd } = getPeriodDates(period);

      console.log('[useMunicipalApplications] Query initiated');
      console.log('[useMunicipalApplications] Period:', period);
      console.log('[useMunicipalApplications] Date Range:', { start: monthStart, end: monthEnd });
      console.log('[useMunicipalApplications] System Date:', new Date().toISOString());

      // Get all building permits submitted this month (exclude draft)
      const { count: permitsCount, error: permitsError } = await supabase
        .from("permit_applications")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .neq("application_status", "draft")
        .gte("submitted_at", monthStart)
        .lte("submitted_at", monthEnd);

      if (permitsError) throw permitsError;
      console.log('[useMunicipalApplications] Building Permits count:', permitsCount);

      // Get all business licenses submitted this month (exclude draft)
      const { count: licensesCount, error: licensesError } = await supabase
        .from("business_license_applications")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .neq("application_status", "draft")
        .gte("submitted_at", monthStart)
        .lte("submitted_at", monthEnd);

      if (licensesError) throw licensesError;
      console.log('[useMunicipalApplications] Business Licenses count:', licensesCount);

      // Get all tax submissions this month (exclude draft)
      const { count: taxesCount, error: taxesError } = await supabase
        .from("tax_submissions")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .neq("submission_status", "draft")
        .gte("submission_date", monthStart)
        .lte("submission_date", monthEnd);

      if (taxesError) throw taxesError;
      console.log('[useMunicipalApplications] Business Taxes count:', taxesCount);

      // Get all service applications submitted this month (exclude draft)
      const { count: servicesCount, error: servicesError } = await supabase
        .from("municipal_service_applications")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .neq("status", "draft")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);

      if (servicesError) throw servicesError;
      console.log('[useMunicipalApplications] Service Applications count:', servicesCount);

      const total = (permitsCount || 0) + (licensesCount || 0) + (taxesCount || 0) + (servicesCount || 0);
      console.log('[useMunicipalApplications] Total Applications:', total);
      console.log('[useMunicipalApplications] Breakdown:', {
        buildingPermits: permitsCount || 0,
        businessLicenses: licensesCount || 0,
        businessTaxes: taxesCount || 0,
        serviceApplications: servicesCount || 0
      });

      return {
        total,
        buildingPermits: permitsCount || 0,
        businessLicenses: licensesCount || 0,
        businessTaxes: taxesCount || 0,
        serviceApplications: servicesCount || 0,
      };
    },
    enabled: !!customerId,
  });
};
