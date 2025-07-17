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

export const useRecentBills = (timeRange: TimeRange) => {
  return useQuery({
    queryKey: ["recent-bills", timeRange],
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

      // Get recent bills with payment information
      const { data: billsData } = await supabase
        .from("master_bills")
        .select(`
          bill_id,
          external_bill_number,
          amount_due_cents,
          payment_status,
          bill_status,
          created_at,
          category,
          first_name,
          last_name,
          business_legal_name
        `)
        .eq("customer_id", profile.customer_id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      // Transform to table format
      const recentBills = billsData?.map((bill) => ({
        id: bill.bill_id,
        billNumber: bill.external_bill_number || `BILL-${bill.bill_id.slice(0, 8)}`,
        customer: bill.business_legal_name || `${bill.first_name || "Unknown"} ${bill.last_name || "Customer"}`,
        amount: `$${((bill.amount_due_cents || 0) / 100).toFixed(2)}`,
        status: getStatusLabel(bill.payment_status, bill.bill_status),
        date: new Date(bill.created_at).toLocaleDateString(),
        type: bill.category || "General",
      })) || [];

      return recentBills;
    },
  });
};

const getStatusLabel = (paymentStatus: string | null, billStatus: string | null): string => {
  if (paymentStatus === "paid") return "Paid";
  if (billStatus === "overdue") return "Overdue";
  if (paymentStatus === "pending") return "Processing";
  return "Unpaid";
};