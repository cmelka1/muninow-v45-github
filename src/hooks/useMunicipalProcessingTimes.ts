import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProcessingTimes {
  overall: number;
  buildingPermits: number;
  businessLicenses: number;
  serviceApplications: number;
}

export const useMunicipalProcessingTimes = (customerId: string | undefined) => {
  return useQuery({
    queryKey: ["municipal-processing-times", customerId],
    queryFn: async (): Promise<ProcessingTimes> => {
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      // Calculate average processing time for building permits
      const { data: permits } = await supabase
        .from("permit_applications")
        .select("submitted_at, approved_at, issued_at")
        .eq("customer_id", customerId)
        .not("submitted_at", "is", null)
        .in("application_status", ["approved", "issued"]);

      const permitTimes = permits?.map(p => {
        const start = new Date(p.submitted_at!).getTime();
        const end = new Date(p.issued_at || p.approved_at || new Date()).getTime();
        return (end - start) / (1000 * 60 * 60 * 24); // Convert to days
      }).filter(time => time > 0) || [];
      const avgPermitTime = permitTimes.length > 0 
        ? permitTimes.reduce((a, b) => a + b, 0) / permitTimes.length 
        : 0;

      // Calculate average processing time for business licenses
      const { data: licenses } = await supabase
        .from("business_license_applications")
        .select("submitted_at, approved_at, issued_at")
        .eq("customer_id", customerId)
        .not("submitted_at", "is", null)
        .in("application_status", ["approved", "issued"]);

      const licenseTimes = licenses?.map(l => {
        const start = new Date(l.submitted_at!).getTime();
        const end = new Date(l.issued_at || l.approved_at || new Date()).getTime();
        return (end - start) / (1000 * 60 * 60 * 24);
      }).filter(time => time > 0) || [];
      const avgLicenseTime = licenseTimes.length > 0
        ? licenseTimes.reduce((a, b) => a + b, 0) / licenseTimes.length
        : 0;

      // Calculate average processing time for service applications
      // Note: Service applications use created_at as submission time and updated_at when status changes
      const { data: services } = await supabase
        .from("municipal_service_applications")
        .select("created_at, updated_at, status")
        .eq("customer_id", customerId)
        .not("created_at", "is", null)
        .in("status", ["approved", "issued"]);

      const serviceTimes = services?.map(s => {
        const start = new Date(s.created_at).getTime();
        const end = new Date(s.updated_at).getTime();
        return (end - start) / (1000 * 60 * 60 * 24);
      }).filter(time => time > 0) || [];
      const avgServiceTime = serviceTimes.length > 0
        ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length
        : 0;

      const allTimes = [...permitTimes, ...licenseTimes, ...serviceTimes];
      const overall = allTimes.length > 0
        ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length
        : 0;

      return {
        overall: Math.round(overall * 10) / 10,
        buildingPermits: Math.round(avgPermitTime * 10) / 10,
        businessLicenses: Math.round(avgLicenseTime * 10) / 10,
        serviceApplications: Math.round(avgServiceTime * 10) / 10,
      };
    },
    enabled: !!customerId,
  });
};
