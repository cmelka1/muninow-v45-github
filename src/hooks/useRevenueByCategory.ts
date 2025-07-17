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

export const useRevenueByCategory = (timeRange: TimeRange) => {
  return useQuery({
    queryKey: ["revenue-by-category", timeRange],
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

      // Revenue by category from payment history
      const { data: categoryData } = await supabase
        .from("payment_history")
        .select("category, total_amount_cents")
        .eq("customer_id", profile.customer_id)
        .eq("transfer_state", "SUCCEEDED")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .not("category", "is", null);

      // Group by category and sum revenue
      const categoryMap = new Map<string, number>();
      
      categoryData?.forEach((payment) => {
        const category = payment.category || "Other";
        const amount = payment.total_amount_cents || 0;
        categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
      });

      // Convert to chart format
      const chartData = Array.from(categoryMap.entries()).map(([category, amount]) => ({
        name: category,
        value: amount / 100, // Convert cents to dollars
        fill: getCategoryColor(category),
      }));

      return chartData.sort((a, b) => b.value - a.value);
    },
  });
};

const getCategoryColor = (category: string): string => {
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];
  
  const categoryColors: Record<string, string> = {
    "Utilities & Services": colors[0],
    "Property-Related": colors[1],
    "Vehicle & Transportation": colors[2],
    "Licensing & Registration": colors[3],
    "Other": colors[4],
  };
  
  return categoryColors[category] || colors[4];
};