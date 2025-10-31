import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RevenueData {
  monthlyBaseAmount: number;
  monthlyServiceFees: number;
  monthlyTotal: number;
  transactionCount: number;
  dailyRevenue: { date: string; amount: number }[];
}

export type Period = "last_7_days" | "last_30_days" | "last_3_months" | "last_6_months" | "this_year";

const getPeriodDates = (period: Period) => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(); // Current moment

  switch (period) {
    case "last_7_days":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last_30_days":
      // Calculate 30 days ago from start of today
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      startDate = new Date(Date.UTC(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0, 0, 0));
      // End date is now (current moment)
      endDate = now;
      break;
    case "last_3_months":
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      startDate = new Date(Date.UTC(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth(), threeMonthsAgo.getDate(), 0, 0, 0, 0));
      endDate = now;
      break;
    case "last_6_months":
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      startDate = new Date(Date.UTC(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), sixMonthsAgo.getDate(), 0, 0, 0, 0));
      endDate = now;
      break;
    case "this_year":
      startDate = new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59, 999));
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const dates = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
  console.log('[useMunicipalRevenue] Period:', period, 'Dates:', dates);
  return dates;
};

export const useMunicipalRevenue = (customerId: string | undefined, period: Period = "last_7_days") => {
  return useQuery({
    queryKey: ["municipal-revenue", customerId, period],
    queryFn: async (): Promise<RevenueData> => {
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      const { startDate: monthStart, endDate: monthEnd } = getPeriodDates(period);

      // Get all paid transactions for this customer in the period
      const { data: transactions, error } = await supabase
        .from("payment_transactions")
        .select("id, base_amount_cents, service_fee_cents, total_amount_cents, updated_at, permit_id, business_license_id, service_application_id, tax_submission_id")
        .eq("customer_id", customerId)
        .eq("payment_status", "paid")
        .gte("updated_at", monthStart)
        .lte("updated_at", monthEnd);

      if (error) throw error;
      
      console.log('[useMunicipalRevenue] Found transactions:', transactions?.length || 0);
      
      if (!transactions || transactions.length === 0) {
        console.log('[useMunicipalRevenue] No transactions found for period');
        return {
          monthlyBaseAmount: 0,
          monthlyServiceFees: 0,
          monthlyTotal: 0,
          transactionCount: 0,
          dailyRevenue: [],
        };
      }

      // Get IDs for batch queries
      const permitIds = transactions.filter(tx => tx.permit_id).map(tx => tx.permit_id as string);
      const licenseIds = transactions.filter(tx => tx.business_license_id).map(tx => tx.business_license_id as string);
      const serviceIds = transactions.filter(tx => tx.service_application_id).map(tx => tx.service_application_id as string);
      const taxIds = transactions.filter(tx => tx.tax_submission_id).map(tx => tx.tax_submission_id as string);

      // Batch query all entities to check draft status
      const draftIds = new Set<string>();

      // Check permits - note: permit_applications uses permit_id as primary key
      if (permitIds.length > 0) {
        const { data: permits } = await supabase
          .from("permit_applications")
          .select("permit_id")
          .in("permit_id", permitIds)
          .eq("application_status", "draft");
        permits?.forEach(p => draftIds.add(p.permit_id));
      }

      // Check business licenses - uses id
      if (licenseIds.length > 0) {
        const { data: licenses } = await supabase
          .from("business_license_applications")
          .select("id")
          .in("id", licenseIds)
          .eq("application_status", "draft");
        licenses?.forEach(l => draftIds.add(l.id));
      }

      // Check service applications - uses id
      if (serviceIds.length > 0) {
        const { data: services } = await supabase
          .from("municipal_service_applications")
          .select("id")
          .in("id", serviceIds)
          .eq("status", "draft");
        services?.forEach(s => draftIds.add(s.id));
      }

      // Check tax submissions - uses id
      if (taxIds.length > 0) {
        const { data: taxes } = await supabase
          .from("tax_submissions")
          .select("id")
          .in("id", taxIds)
          .eq("submission_status", "draft");
        taxes?.forEach(t => draftIds.add(t.id));
      }

      // Filter out transactions with draft entities
      const validTransactions = transactions.filter(tx => {
        if (tx.permit_id && draftIds.has(tx.permit_id)) return false;
        if (tx.business_license_id && draftIds.has(tx.business_license_id)) return false;
        if (tx.service_application_id && draftIds.has(tx.service_application_id)) return false;
        if (tx.tax_submission_id && draftIds.has(tx.tax_submission_id)) return false;
        return true;
      });

      console.log('[useMunicipalRevenue] Valid transactions after filtering drafts:', validTransactions.length);

      // Calculate totals
      const monthlyBaseAmount = validTransactions.reduce(
        (sum, tx) => sum + (tx.base_amount_cents || 0),
        0
      ) / 100;

      const monthlyServiceFees = validTransactions.reduce(
        (sum, tx) => sum + (tx.service_fee_cents || 0),
        0
      ) / 100;

      const monthlyTotal = validTransactions.reduce(
        (sum, tx) => sum + (tx.total_amount_cents || 0),
        0
      ) / 100;

      // Group by day for daily revenue chart using updated_at
      const dailyRevenueMap = new Map<string, number>();
      validTransactions.forEach(tx => {
        const date = new Date(tx.updated_at).toISOString().split("T")[0];
        const current = dailyRevenueMap.get(date) || 0;
        dailyRevenueMap.set(date, current + (tx.base_amount_cents || 0) / 100);
      });

      const dailyRevenue = Array.from(dailyRevenueMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      console.log('[useMunicipalRevenue] Final calculations:', {
        monthlyBaseAmount,
        monthlyServiceFees,
        monthlyTotal,
        transactionCount: validTransactions.length
      });

      return {
        monthlyBaseAmount,
        monthlyServiceFees,
        monthlyTotal,
        transactionCount: validTransactions.length,
        dailyRevenue,
      };
    },
    enabled: !!customerId,
  });
};
