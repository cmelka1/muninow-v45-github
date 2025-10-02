import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProcessingTimes {
  overall: number;
  buildingPermits: number;
  businessLicenses: number;
  serviceApplications: number;
}

interface ProcessingTimesResult {
  period: ProcessingTimes;
  allTime: ProcessingTimes;
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

export const useMunicipalProcessingTimes = (customerId: string | undefined, period: Period = "last_7_days") => {
  return useQuery({
    queryKey: ["municipal-processing-times", customerId, period],
    queryFn: async (): Promise<ProcessingTimesResult> => {
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      const { startDate, endDate } = getPeriodDates(period);

      // ===== PERIOD-SPECIFIC PROCESSING TIMES (filtered by completion date) =====
      
      // Building permits - filter by completion date (approved_at or issued_at)
      const { data: periodPermits } = await supabase
        .from("permit_applications")
        .select("submitted_at, approved_at, issued_at")
        .eq("customer_id", customerId)
        .not("submitted_at", "is", null)
        .in("application_status", ["approved", "issued"])
        .or(`approved_at.gte.${startDate},issued_at.gte.${startDate}`)
        .or(`approved_at.lte.${endDate},issued_at.lte.${endDate}`);

      const periodPermitTimes = periodPermits?.map(p => {
        const start = new Date(p.submitted_at!).getTime();
        const end = new Date(p.issued_at || p.approved_at || new Date()).getTime();
        return (end - start) / (1000 * 60 * 60 * 24);
      }).filter(time => time > 0) || [];
      const periodAvgPermitTime = periodPermitTimes.length > 0 
        ? periodPermitTimes.reduce((a, b) => a + b, 0) / periodPermitTimes.length 
        : 0;

      // Business licenses - filter by completion date
      const { data: periodLicenses } = await supabase
        .from("business_license_applications")
        .select("submitted_at, approved_at, issued_at")
        .eq("customer_id", customerId)
        .not("submitted_at", "is", null)
        .in("application_status", ["approved", "issued"])
        .or(`approved_at.gte.${startDate},issued_at.gte.${startDate}`)
        .or(`approved_at.lte.${endDate},issued_at.lte.${endDate}`);

      const periodLicenseTimes = periodLicenses?.map(l => {
        const start = new Date(l.submitted_at!).getTime();
        const end = new Date(l.issued_at || l.approved_at || new Date()).getTime();
        return (end - start) / (1000 * 60 * 60 * 24);
      }).filter(time => time > 0) || [];
      const periodAvgLicenseTime = periodLicenseTimes.length > 0
        ? periodLicenseTimes.reduce((a, b) => a + b, 0) / periodLicenseTimes.length
        : 0;

      // Service applications - filter by completion date (updated_at)
      const { data: periodServices } = await supabase
        .from("municipal_service_applications")
        .select("created_at, updated_at, status")
        .eq("customer_id", customerId)
        .not("created_at", "is", null)
        .in("status", ["approved", "issued"])
        .gte("updated_at", startDate)
        .lte("updated_at", endDate);

      const periodServiceTimes = periodServices?.map(s => {
        const start = new Date(s.created_at).getTime();
        const end = new Date(s.updated_at).getTime();
        return (end - start) / (1000 * 60 * 60 * 24);
      }).filter(time => time > 0) || [];
      const periodAvgServiceTime = periodServiceTimes.length > 0
        ? periodServiceTimes.reduce((a, b) => a + b, 0) / periodServiceTimes.length
        : 0;

      const periodAllTimes = [...periodPermitTimes, ...periodLicenseTimes, ...periodServiceTimes];
      const periodOverall = periodAllTimes.length > 0
        ? periodAllTimes.reduce((a, b) => a + b, 0) / periodAllTimes.length
        : 0;

      // ===== ALL-TIME PROCESSING TIMES (no date filter) =====
      
      // Building permits - all time
      const { data: allTimePermits } = await supabase
        .from("permit_applications")
        .select("submitted_at, approved_at, issued_at")
        .eq("customer_id", customerId)
        .not("submitted_at", "is", null)
        .in("application_status", ["approved", "issued"]);

      const allTimePermitTimes = allTimePermits?.map(p => {
        const start = new Date(p.submitted_at!).getTime();
        const end = new Date(p.issued_at || p.approved_at || new Date()).getTime();
        return (end - start) / (1000 * 60 * 60 * 24);
      }).filter(time => time > 0) || [];
      const allTimeAvgPermitTime = allTimePermitTimes.length > 0 
        ? allTimePermitTimes.reduce((a, b) => a + b, 0) / allTimePermitTimes.length 
        : 0;

      // Business licenses - all time
      const { data: allTimeLicenses } = await supabase
        .from("business_license_applications")
        .select("submitted_at, approved_at, issued_at")
        .eq("customer_id", customerId)
        .not("submitted_at", "is", null)
        .in("application_status", ["approved", "issued"]);

      const allTimeLicenseTimes = allTimeLicenses?.map(l => {
        const start = new Date(l.submitted_at!).getTime();
        const end = new Date(l.issued_at || l.approved_at || new Date()).getTime();
        return (end - start) / (1000 * 60 * 60 * 24);
      }).filter(time => time > 0) || [];
      const allTimeAvgLicenseTime = allTimeLicenseTimes.length > 0
        ? allTimeLicenseTimes.reduce((a, b) => a + b, 0) / allTimeLicenseTimes.length
        : 0;

      // Service applications - all time
      const { data: allTimeServices } = await supabase
        .from("municipal_service_applications")
        .select("created_at, updated_at, status")
        .eq("customer_id", customerId)
        .not("created_at", "is", null)
        .in("status", ["approved", "issued"]);

      const allTimeServiceTimes = allTimeServices?.map(s => {
        const start = new Date(s.created_at).getTime();
        const end = new Date(s.updated_at).getTime();
        return (end - start) / (1000 * 60 * 60 * 24);
      }).filter(time => time > 0) || [];
      const allTimeAvgServiceTime = allTimeServiceTimes.length > 0
        ? allTimeServiceTimes.reduce((a, b) => a + b, 0) / allTimeServiceTimes.length
        : 0;

      const allTimeAllTimes = [...allTimePermitTimes, ...allTimeLicenseTimes, ...allTimeServiceTimes];
      const allTimeOverall = allTimeAllTimes.length > 0
        ? allTimeAllTimes.reduce((a, b) => a + b, 0) / allTimeAllTimes.length
        : 0;

      return {
        period: {
          overall: Math.round(periodOverall * 10) / 10,
          buildingPermits: Math.round(periodAvgPermitTime * 10) / 10,
          businessLicenses: Math.round(periodAvgLicenseTime * 10) / 10,
          serviceApplications: Math.round(periodAvgServiceTime * 10) / 10,
        },
        allTime: {
          overall: Math.round(allTimeOverall * 10) / 10,
          buildingPermits: Math.round(allTimeAvgPermitTime * 10) / 10,
          businessLicenses: Math.round(allTimeAvgLicenseTime * 10) / 10,
          serviceApplications: Math.round(allTimeAvgServiceTime * 10) / 10,
        }
      };
    },
    enabled: !!customerId,
  });
};
