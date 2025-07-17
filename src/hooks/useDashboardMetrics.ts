import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, subMonths, subYears } from "date-fns";

export type TimeRange = "7d" | "30d" | "3m" | "6m" | "1y";

const getDateRange = (timeRange: TimeRange) => {
  const now = new Date();
  const endDate = endOfDay(now);
  
  switch (timeRange) {
    case "7d":
      return { startDate: startOfDay(subDays(now, 7)), endDate };
    case "30d":
      return { startDate: startOfDay(subDays(now, 30)), endDate };
    case "3m":
      return { startDate: startOfDay(subMonths(now, 3)), endDate };
    case "6m":
      return { startDate: startOfDay(subMonths(now, 6)), endDate };
    case "1y":
      return { startDate: startOfDay(subYears(now, 1)), endDate };
    default:
      return { startDate: startOfDay(subDays(now, 30)), endDate };
  }
};

export const useDashboardMetrics = (timeRange: TimeRange) => {
  return useQuery({
    queryKey: ["dashboard-metrics", timeRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange(timeRange);
      
      // Get current user's customer_id for municipal users
      const { data: profile } = await supabase
        .from("profiles")
        .select("customer_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.customer_id) {
        throw new Error("No customer ID found");
      }

      // Total revenue from payment history
      const { data: revenueData } = await supabase
        .from("payment_history")
        .select("total_amount_cents")
        .eq("customer_id", profile.customer_id)
        .eq("transfer_state", "SUCCEEDED")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Bills processed count
      const { data: billsData } = await supabase
        .from("master_bills")
        .select("bill_id")
        .eq("customer_id", profile.customer_id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Collection rate (paid vs total bills)
      const { data: paidBills } = await supabase
        .from("master_bills")
        .select("bill_id")
        .eq("customer_id", profile.customer_id)
        .eq("payment_status", "paid")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Outstanding bills
      const { data: outstandingBills } = await supabase
        .from("master_bills")
        .select("amount_due_cents")
        .eq("customer_id", profile.customer_id)
        .in("payment_status", ["unpaid"])
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      const totalRevenue = revenueData?.reduce((sum, payment) => sum + (payment.total_amount_cents || 0), 0) || 0;
      const billsProcessed = billsData?.length || 0;
      const collectionRate = billsData?.length ? ((paidBills?.length || 0) / billsData.length) * 100 : 0;
      const outstandingAmount = outstandingBills?.reduce((sum, bill) => sum + (bill.amount_due_cents || 0), 0) || 0;

      return {
        totalRevenue: totalRevenue / 100, // Convert cents to dollars
        billsProcessed,
        collectionRate,
        outstandingBills: outstandingAmount / 100,
      };
    },
  });
};