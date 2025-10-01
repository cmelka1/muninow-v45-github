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

  // Prepare chart data
  const applicationsBreakdownData = applications ? [
    { name: "Building Permits", value: applications.buildingPermits, color: "hsl(var(--chart-1))" },
    { name: "Business Licenses", value: applications.businessLicenses, color: "hsl(var(--chart-2))" },
    { name: "Business Taxes", value: applications.businessTaxes, color: "hsl(var(--chart-3))" },
    { name: "Other Services", value: applications.serviceApplications, color: "hsl(var(--chart-4))" },
  ].filter(item => item.value > 0) : [];

  const processingTimeData = processingTimes ? [
    { service: "Building Permits", days: processingTimes.buildingPermits },
    { service: "Business Licenses", days: processingTimes.businessLicenses },
    { service: "Service Apps", days: processingTimes.serviceApplications },
  ].filter(item => item.days > 0) : [];

  const chartConfig = {
    buildingPermits: {
      label: "Building Permits",
      color: "hsl(var(--chart-1))",
    },
    businessLicenses: {
      label: "Business Licenses",
      color: "hsl(var(--chart-2))",
    },
    businessTaxes: {
      label: "Business Taxes",
      color: "hsl(var(--chart-3))",
    },
    serviceApplications: {
      label: "Other Services",
      color: "hsl(var(--chart-4))",
    },
    days: {
      label: "Days",
      color: "hsl(var(--chart-5))",
    },
    amount: {
      label: "Revenue",
      color: "hsl(var(--primary))",
    },
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
            <div className="text-2xl font-bold">{processingTimes?.overall.toFixed(1) || 0} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              {getPeriodLabel(selectedPeriod)}
            </p>
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

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Applications by Service Type</CardTitle>
            <CardDescription>Submitted applications this month</CardDescription>
          </CardHeader>
          <CardContent>
            {applicationsBreakdownData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={applicationsBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {applicationsBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No applications this month
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processing Efficiency</CardTitle>
            <CardDescription>Average days by service type</CardDescription>
          </CardHeader>
          <CardContent>
            {processingTimeData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processingTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="service" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="days" fill="hsl(var(--chart-5))" name="Days" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No processing data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue Trend</CardTitle>
          <CardDescription>Revenue for current month</CardDescription>
        </CardHeader>
        <CardContent>
          {revenue && revenue.dailyRevenue.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue.dailyRevenue}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).getDate().toString()}
                  />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No revenue data for this month
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Key metrics overview</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Applications</span>
            <span className="font-medium">{applications?.total || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Building Permits</span>
            <span className="font-medium">{applications?.buildingPermits || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Business Licenses</span>
            <span className="font-medium">{applications?.businessLicenses || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Business Taxes</span>
            <span className="font-medium">{applications?.businessTaxes || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Other Services</span>
            <span className="font-medium">{applications?.serviceApplications || 0}</span>
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">Average Processing</span>
            <span className="font-medium">{processingTimes?.overall || 0} days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Monthly Revenue</span>
            <span className="font-medium">
              ${revenue?.monthlyBaseAmount.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "0.00"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MunicipalDashboard;
