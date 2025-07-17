import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  Users,
  CreditCard,
  Building2,
  Activity,
  CheckCircle,
  Clock
} from "lucide-react";
import { useDashboardMetrics, type TimeRange } from "@/hooks/useDashboardMetrics";
import { useRevenueByCategory } from "@/hooks/useRevenueByCategory";
import { useMonthlyRevenue } from "@/hooks/useMonthlyRevenue";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useRecentBills } from "@/hooks/useRecentBills";

// Top departments data (keeping static for now as it's not in the main data flow)
const topDepartments = [
  { department: "Water & Sewer", revenue: 89500, growth: "+12%" },
  { department: "Building Permits", revenue: 67200, growth: "+8%" },
  { department: "Parking", revenue: 45100, growth: "+15%" },
  { department: "Property Tax", revenue: 234800, growth: "+5%" },
];

const chartConfig = {
  actual: {
    label: "Actual",
    color: "hsl(var(--chart-1))",
  },
  budget: {
    label: "Budget",
    color: "hsl(var(--chart-2))",
  },
};

const MunicipalDashboard = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  
  const timeRangeOptions = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "3m", label: "Last 3 months" },
    { value: "6m", label: "Last 6 months" },
    { value: "1y", label: "Last year" },
  ] as const;

  // Fetch dynamic data
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics(timeRange);
  const { data: revenueByCategory, isLoading: categoryLoading } = useRevenueByCategory(timeRange);
  const { data: monthlyRevenue, isLoading: monthlyLoading } = useMonthlyRevenue(timeRange);
  const { data: paymentMethods, isLoading: paymentsLoading } = usePaymentMethods(timeRange);
  const { data: recentBills, isLoading: billsLoading } = useRecentBills(timeRange);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Municipal Dashboard</h1>
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            {timeRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">${metrics?.totalRevenue.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground">
              +8.2% from last period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bills Processed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.billsProcessed.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground">
              +12.1% from last period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.collectionRate.toFixed(1)}%</div>
            )}
            <p className="text-xs text-muted-foreground">
              +2.3% from last period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Bills</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">${metrics?.outstandingBills.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground">
              -5.2% from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Actual vs Budget Revenue</CardTitle>
            <CardDescription>Monthly comparison of revenue performance</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] md:h-[320px] lg:h-[350px]">
            {monthlyLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actual" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                  <Line type="monotone" dataKey="budget" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
            <CardDescription>Revenue collection over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] md:h-[320px] lg:h-[350px]">
            {monthlyLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="actual" fill="hsl(var(--chart-1))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
            <CardDescription>Distribution of revenue sources</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] md:h-[320px] lg:h-[350px]">
            {categoryLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueByCategory?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Distribution of payment types</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {paymentMethods?.map((method, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-chart-1 mr-3" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{method.method}</span>
                        <span className="text-sm text-muted-foreground">{method.count} payments</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2 mt-1">
                        <div 
                          className="bg-chart-1 h-2 rounded-full" 
                          style={{ width: `${method.value}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Departments */}
        <Card>
          <CardHeader>
            <CardTitle>Top Revenue Departments</CardTitle>
            <CardDescription>Department performance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topDepartments.map((dept, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{dept.department}</p>
                      <p className="text-xs text-muted-foreground">
                        ${dept.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{dept.growth}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm">Payment Processing</span>
                </div>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">Bill Generation</span>
                </div>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Customer Portal</span>
                </div>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Data Sync</span>
                </div>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Syncing
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bills Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bills Activity</CardTitle>
          <CardDescription>Latest bill processing activity</CardDescription>
        </CardHeader>
        <CardContent>
          {billsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex space-x-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBills?.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.billNumber}</TableCell>
                    <TableCell>{bill.customer}</TableCell>
                    <TableCell>{bill.amount}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          bill.status === "Paid" ? "default" : 
                          bill.status === "Pending" || bill.status === "Processing" ? "secondary" : 
                          "destructive"
                        }
                      >
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{bill.date}</TableCell>
                    <TableCell>{bill.type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MunicipalDashboard;
