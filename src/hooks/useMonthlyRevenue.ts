import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, subMonths, subYears, format, eachMonthOfInterval, eachDayOfInterval, eachWeekOfInterval, startOfWeek, startOfMonth } from "date-fns";

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

export const useMonthlyRevenue = (timeRange: TimeRange) => {
  return useQuery({
    queryKey: ["monthly-revenue", timeRange],
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

      // Get all revenue data for the time period
      const { data: revenueData } = await supabase
        .from("payment_history")
        .select("created_at, total_amount_cents")
        .eq("customer_id", profile.customer_id)
        .eq("transfer_state", "SUCCEEDED")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at");

      // Generate time intervals based on time range
      let intervals: Date[];
      let formatString: string;

      if (timeRange === "7d") {
        intervals = eachDayOfInterval({ start: startDate, end: endDate });
        formatString = "MMM dd";
      } else if (timeRange === "30d") {
        intervals = eachWeekOfInterval({ start: startDate, end: endDate });
        formatString = "MMM dd";
      } else {
        intervals = eachMonthOfInterval({ start: startDate, end: endDate });
        formatString = "MMM yyyy";
      }

      // Create revenue map by time period
      const revenueMap = new Map<string, number>();
      
      // Initialize all intervals with 0
      intervals.forEach(interval => {
        const key = timeRange === "7d" ? format(interval, "yyyy-MM-dd") :
                   timeRange === "30d" ? format(startOfWeek(interval), "yyyy-MM-dd") :
                   format(startOfMonth(interval), "yyyy-MM");
        revenueMap.set(key, 0);
      });

      // Sum revenue by time period
      revenueData?.forEach((payment) => {
        const paymentDate = new Date(payment.created_at);
        const key = timeRange === "7d" ? format(paymentDate, "yyyy-MM-dd") :
                   timeRange === "30d" ? format(startOfWeek(paymentDate), "yyyy-MM-dd") :
                   format(startOfMonth(paymentDate), "yyyy-MM");
        
        if (revenueMap.has(key)) {
          revenueMap.set(key, revenueMap.get(key)! + (payment.total_amount_cents || 0));
        }
      });

      // Convert to chart format
      const chartData = intervals.map(interval => {
        const key = timeRange === "7d" ? format(interval, "yyyy-MM-dd") :
                   timeRange === "30d" ? format(startOfWeek(interval), "yyyy-MM-dd") :
                   format(startOfMonth(interval), "yyyy-MM");
        
        return {
          month: format(interval, formatString),
          actual: (revenueMap.get(key) || 0) / 100, // Convert cents to dollars
          budget: ((revenueMap.get(key) || 0) * 1.1) / 100, // 10% higher for demo
        };
      });

      return chartData;
    },
  });
};