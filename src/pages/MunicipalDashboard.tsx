import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Activity, DollarSign, FileCheck, Clock, FileBarChart, ClipboardList } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import ReportBuilder from "@/components/ReportBuilder";
import { useState } from "react";
import { useAuth } from "@/contexts/SimpleAuthContext";
import { useMunicipalApplications, Period } from "@/hooks/useMunicipalApplications";
import { useMunicipalProcessingTimes } from "@/hooks/useMunicipalProcessingTimes";
import { useMunicipalRevenue } from "@/hooks/useMunicipalRevenue";
import { useMunicipalReviewQueue } from "@/hooks/useMunicipalReviewQueue";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigate } from "react-router-dom";

const MunicipalDashboard = () => {
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("last_7_days");
  const { profile } = useAuth();

  // Check if user has municipal access
  if (!profile?.account_type || !["municipal", "municipaladmin", "municipaluser"].includes(profile.account_type)) {
    return <Navigate to="/signin" replace />;
  }

  const customerId = profile.customer_id;

  // Fetch real-time municipal data
  const { data: applications, isLoading: applicationsLoading } = useMunicipalApplications(customerId, selectedPeriod);
  const { data: processingTimes, isLoading: processingLoading } = useMunicipalProcessingTimes(customerId, selectedPeriod);
  const { data: revenue, isLoading: revenueLoading } = useMunicipalRevenue(customerId, selectedPeriod);
  const { data: reviewQueue, isLoading: reviewQueueLoading } = useMunicipalReviewQueue(customerId);

  const isLoading = applicationsLoading || processingLoading || revenueLoading || reviewQueueLoading;

  const getPeriodLabel = (period: Period) => {
    switch (period) {
      case "last_7_days": return "Last 7 Days";
      case "last_30_days": return "Last 30 Days";
      case "last_3_months": return "Last 3 Months";
      case "last_6_months": return "Last 6 Months";
      case "this_year": return "This Year";
      default: return "Last 7 Days";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Municipal Dashboard</h1>
          <p className="text-muted-foreground">Real-time insights for your municipality</p>
        </div>
        <div className="flex gap-3 items-center">
          <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as Period)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <ReportBuilder>
            <Button variant="outline" className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4" />
              Create Report
            </Button>
          </ReportBuilder>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {getPeriodLabel(selectedPeriod)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${revenue?.monthlyTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getPeriodLabel(selectedPeriod)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processingTimes?.period.overall.toFixed(1) || 0} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getPeriodLabel(selectedPeriod)}
            </p>
            {processingTimes?.allTime.overall > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                All-time average: {processingTimes.allTime.overall.toFixed(1)} days
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Review Queue</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewQueue || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Applications awaiting review
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MunicipalDashboard;
