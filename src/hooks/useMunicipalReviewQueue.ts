import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useMunicipalReviewQueue = (customerId: string | undefined) => {
  return useQuery({
    queryKey: ["municipal-review-queue", customerId],
    queryFn: async (): Promise<number> => {
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      let totalInReview = 0;

      // Count permits under review
      const { count: permitCount } = await supabase
        .from("permit_applications")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .in("application_status", ["under_review", "submitted"]);

      totalInReview += permitCount || 0;

      // Count business licenses under review
      const { count: licenseCount } = await supabase
        .from("business_license_applications")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .in("application_status", ["under_review", "submitted"]);

      totalInReview += licenseCount || 0;

      // Count service applications under review
      const { count: serviceCount } = await supabase
        .from("municipal_service_applications")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .in("status", ["under_review", "submitted"]);

      totalInReview += serviceCount || 0;

      // Count tax submissions under review
      const { count: taxCount } = await supabase
        .from("tax_submissions")
        .select("*", { count: "exact", head: true })
        .eq("customer_id", customerId)
        .in("submission_status", ["under_review", "submitted"]);

      totalInReview += taxCount || 0;

      return totalInReview;
    },
    enabled: !!customerId,
  });
};
