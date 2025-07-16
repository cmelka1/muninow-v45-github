import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer as RechartsResponsiveContainer, Area, AreaChart } from 'recharts';
import ReportBuilder from '@/components/ReportBuilder';
import ResponsiveContainer from '@/components/ui/responsive-container';
import ResponsiveTypography from '@/components/ui/responsive-typography';
import { useResponsiveNavigation } from '@/hooks/useResponsiveNavigation';
import { contentSpacing, touchTargets, typography } from '@/utils/responsiveTokens';
import { 
  DollarSign, 
  FileText, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CreditCard,
  Building2,
  Car,
  Calendar,
  CheckCircle,
  XCircle,
  Timer,
  FileBarChart
} from 'lucide-react';

// Dummy data for the dashboard
const monthlyRevenue = [
  { month: 'Jan', revenue: 2850000, bills: 12500, collection: 92 },
  { month: 'Feb', revenue: 2620000, bills: 11800, collection: 89 },
  { month: 'Mar', revenue: 3100000, bills: 13200, collection: 94 },
  { month: 'Apr', revenue: 2950000, bills: 12900, collection: 91 },
  { month: 'May', revenue: 3350000, bills: 14100, collection: 96 },
  { month: 'Jun', revenue: 3200000, bills: 13800, collection: 93 },
];

const revenueByCategory = [
  { category: 'Property Taxes', revenue: 8500000, percentage: 45, color: '#8884d8' },
  { category: 'Traffic Fines', revenue: 2100000, percentage: 11, color: '#82ca9d' },
  { category: 'Permits & Licenses', revenue: 1800000, percentage: 10, color: '#ffc658' },
  { category: 'Utilities', revenue: 3200000, percentage: 17, color: '#ff7c7c' },
  { category: 'Other Fees', revenue: 3200000, percentage: 17, color: '#8dd1e1' },
];

const actualVsBudget = [
  { month: 'Jan', actual: 2850000, budget: 3000000 },
  { month: 'Feb', actual: 2620000, budget: 2800000 },
  { month: 'Mar', actual: 3100000, budget: 3200000 },
  { month: 'Apr', actual: 2950000, budget: 3100000 },
  { month: 'May', actual: 3350000, budget: 3400000 },
  { month: 'Jun', actual: 3200000, budget: 3300000 },
];

const paymentMethods = [
  { method: 'Online Payment', count: 45600, percentage: 62 },
  { method: 'ACH Transfer', count: 18200, percentage: 25 },
  { method: 'In-Person', count: 7300, percentage: 10 },
  { method: 'Phone Payment', count: 2200, percentage: 3 },
];

const recentBills = [
  { id: 'B-2024-001', type: 'Property Tax', amount: 2450, status: 'Paid', date: '2024-01-15' },
  { id: 'B-2024-002', type: 'Parking Fine', amount: 75, status: 'Overdue', date: '2024-01-12' },
  { id: 'B-2024-003', type: 'Business License', amount: 150, status: 'Paid', date: '2024-01-14' },
  { id: 'B-2024-004', type: 'Water Bill', amount: 89, status: 'Pending', date: '2024-01-16' },
  { id: 'B-2024-005', type: 'Building Permit', amount: 500, status: 'Paid', date: '2024-01-13' },
];

const topDepartments = [
  { department: 'Property Assessment', revenue: 8500000, growth: 12 },
  { department: 'Transportation', revenue: 2100000, growth: -5 },
  { department: 'Planning & Zoning', revenue: 1800000, growth: 8 },
  { department: 'Public Works', revenue: 1600000, growth: 15 },
];

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
  bills: {
    label: "Bills Issued",
    color: "hsl(var(--secondary))",
  },
  collection: {
    label: "Collection Rate",
    color: "hsl(var(--accent))",
  },
  actual: {
    label: "Actual Revenue",
    color: "hsl(var(--primary))",
  },
  budget: {
    label: "Budget Revenue",
    color: "hsl(var(--muted-foreground))",
  },
};

const MunicipalDashboard = () => {
  const { isMobile } = useResponsiveNavigation();
  
  // Responsive chart dimensions
  const getChartHeight = () => isMobile ? 'h-[300px] sm:h-[350px] lg:h-[400px]' : 'h-[400px] xl:h-[450px]';
  const getChartContentHeight = () => isMobile ? 'h-[220px] sm:h-[270px] lg:h-[320px]' : 'h-[320px] xl:h-[370px]';
  const getPieRadius = () => isMobile ? 60 : 80;
  
  // Responsive grid configurations
  const kpiGridCols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  const mainChartCols = 'grid-cols-1 xl:grid-cols-2';
  const secondaryChartCols = 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
  
  return (
    <ResponsiveContainer variant="container" maxWidth="full" className="space-y-4 md:space-y-6">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <ResponsiveTypography variant="h1">
            Municipal Dashboard
          </ResponsiveTypography>
        </div>
        <ReportBuilder>
          <Button 
            variant="outline" 
            className={`flex items-center gap-2 ${isMobile ? touchTargets.mobile.button : touchTargets.desktop.button}`}
          >
            <FileBarChart className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
            {!isMobile && 'Create Report'}
            {isMobile && 'Report'}
          </Button>
        </ReportBuilder>
      </div>

      {/* KPI Cards */}
      <div className={`grid ${kpiGridCols} gap-4 md:gap-6`}>
        <Card className={isMobile ? contentSpacing.mobile.card : contentSpacing.desktop.card}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={isMobile ? typography.mobile.small : typography.desktop.small}>Total Revenue</CardTitle>
            <DollarSign className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-muted-foreground`} />
          </CardHeader>
          <CardContent>
            <div className={isMobile ? typography.mobile.h3 : typography.desktop.h3}>$18.8M</div>
            <p className={isMobile ? typography.mobile.caption : typography.desktop.caption}>
              <TrendingUp className={`inline ${isMobile ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
              +12.5% from last year
            </p>
          </CardContent>
        </Card>

        <Card className={isMobile ? contentSpacing.mobile.card : contentSpacing.desktop.card}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={isMobile ? typography.mobile.small : typography.desktop.small}>Bills Processed</CardTitle>
            <FileText className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-muted-foreground`} />
          </CardHeader>
          <CardContent>
            <div className={isMobile ? typography.mobile.h3 : typography.desktop.h3}>73,500</div>
            <p className={isMobile ? typography.mobile.caption : typography.desktop.caption}>
              +2,100 this month
            </p>
          </CardContent>
        </Card>

        <Card className={isMobile ? contentSpacing.mobile.card : contentSpacing.desktop.card}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={isMobile ? typography.mobile.small : typography.desktop.small}>Collection Rate</CardTitle>
            <CheckCircle className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-muted-foreground`} />
          </CardHeader>
          <CardContent>
            <div className={isMobile ? typography.mobile.h3 : typography.desktop.h3}>92.8%</div>
            <p className={isMobile ? typography.mobile.caption : typography.desktop.caption}>
              +1.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card className={isMobile ? contentSpacing.mobile.card : contentSpacing.desktop.card}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={isMobile ? typography.mobile.small : typography.desktop.small}>Outstanding Bills</CardTitle>
            <Clock className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-muted-foreground`} />
          </CardHeader>
          <CardContent>
            <div className={isMobile ? typography.mobile.h3 : typography.desktop.h3}>$1.3M</div>
            <p className={isMobile ? typography.mobile.caption : typography.desktop.caption}>
              <AlertCircle className={`inline ${isMobile ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
              156 overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className={`grid ${mainChartCols} gap-4 md:gap-6`}>
        {/* Actual vs Budget Revenue */}
        <Card className={getChartHeight()}>
          <CardHeader>
            <ResponsiveTypography variant="h4">Actual vs Budget Revenue</ResponsiveTypography>
          </CardHeader>
          <CardContent className={getChartContentHeight()}>
            <ChartContainer config={chartConfig} className="h-full">
              <RechartsResponsiveContainer width="100%" height="100%">
                <BarChart data={actualVsBudget} barCategoryGap={isMobile ? "10%" : "20%"}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={isMobile ? 10 : 12}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                    fontSize={isMobile ? 10 : 12}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value) => [`$${(Number(value) / 1000000).toFixed(2)}M`]}
                  />
                  <Bar 
                    dataKey="actual" 
                    fill="hsl(var(--primary))" 
                    radius={[2, 2, 0, 0]}
                    name="Actual Revenue"
                  />
                  <Bar 
                    dataKey="budget" 
                    fill="hsl(var(--muted-foreground))" 
                    radius={[2, 2, 0, 0]}
                    name="Budget Revenue"
                  />
                </BarChart>
              </RechartsResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className={getChartHeight()}>
          <CardHeader>
            <ResponsiveTypography variant="h4">Monthly Revenue Trend</ResponsiveTypography>
          </CardHeader>
          <CardContent className={getChartContentHeight()}>
            <ChartContainer config={chartConfig} className="h-full">
              <RechartsResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={isMobile ? 10 : 12}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                    fontSize={isMobile ? 10 : 12}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value) => [`$${(Number(value) / 1000000).toFixed(2)}M`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </RechartsResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Category and Additional Metrics */}
      <div className={`grid ${secondaryChartCols} gap-4 md:gap-6`}>
        {/* Revenue by Category */}
        <Card className={getChartHeight()}>
          <CardHeader>
            <ResponsiveTypography variant="h4">Revenue by Category</ResponsiveTypography>
          </CardHeader>
          <CardContent className={getChartContentHeight()}>
            <ChartContainer config={chartConfig} className="h-full">
              <RechartsResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByCategory}
                    cx="50%"
                    cy="50%"
                    outerRadius={getPieRadius()}
                    dataKey="revenue"
                    label={!isMobile ? ({ category, percentage }) => `${category}: ${percentage}%` : false}
                    labelLine={!isMobile}
                  >
                    {revenueByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value) => [`$${(Number(value) / 1000000).toFixed(1)}M`, 'Revenue']}
                  />
                </PieChart>
              </RechartsResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className={getChartHeight()}>
          <CardHeader>
            <ResponsiveTypography variant="h4">Payment Methods</ResponsiveTypography>
          </CardHeader>
          <CardContent className={`${getChartContentHeight()} ${isMobile ? 'space-y-3' : 'space-y-4'} overflow-y-auto`}>
            {paymentMethods.map((method) => (
              <div key={method.method} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                  <span className={isMobile ? typography.mobile.small : typography.desktop.small}>
                    {isMobile ? method.method.split(' ')[0] : method.method}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={method.percentage} className={isMobile ? "w-12" : "w-16"} />
                  <span className={`${isMobile ? typography.mobile.small : typography.desktop.small} font-medium`}>
                    {method.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Departments */}
        <Card className={getChartHeight()}>
          <CardHeader>
            <ResponsiveTypography variant="h4">Top Revenue Departments</ResponsiveTypography>
          </CardHeader>
          <CardContent className={`${getChartContentHeight()} ${isMobile ? 'space-y-3' : 'space-y-4'} overflow-y-auto`}>
            {topDepartments.map((dept) => (
              <div key={dept.department} className="flex items-center justify-between">
                <div>
                  <p className={`${isMobile ? typography.mobile.small : typography.desktop.small} font-medium`}>
                    {isMobile ? dept.department.split(' ')[0] + (dept.department.split(' ')[1] ? ` ${dept.department.split(' ')[1]}` : '') : dept.department}
                  </p>
                  <p className={isMobile ? typography.mobile.caption : typography.desktop.caption}>
                    ${(dept.revenue / 1000000).toFixed(1)}M
                  </p>
                </div>
                <Badge variant={dept.growth > 0 ? "default" : "destructive"}>
                  {dept.growth > 0 ? '+' : ''}{dept.growth}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <Card className={isMobile ? 'h-auto' : 'h-[240px]'}>
          <CardHeader>
            <ResponsiveTypography variant="h4">System Status</ResponsiveTypography>
          </CardHeader>
          <CardContent className={`${isMobile ? 'space-y-3' : 'h-[160px] space-y-4'} ${!isMobile && 'overflow-y-auto'}`}>
            <div className="flex items-center justify-between">
              <span className={isMobile ? typography.mobile.small : typography.desktop.small}>Payment Processing</span>
              <Badge variant="default">
                <CheckCircle className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
                Online
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className={isMobile ? typography.mobile.small : typography.desktop.small}>Bill Generation</span>
              <Badge variant="default">
                <CheckCircle className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className={isMobile ? typography.mobile.small : typography.desktop.small}>Notification Service</span>
              <Badge variant="secondary">
                <Timer className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
                Maintenance
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className={isMobile ? typography.mobile.small : typography.desktop.small}>Data Sync</span>
              <Badge variant="default">
                <CheckCircle className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
                Synced
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card className={isMobile ? 'h-auto' : ''}>
        <CardHeader>
          <ResponsiveTypography variant="h4">Recent Bills Activity</ResponsiveTypography>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className={`text-left ${isMobile ? 'py-3' : 'py-2'} ${isMobile ? typography.mobile.small : typography.desktop.small}`}>
                    {isMobile ? 'ID' : 'Bill ID'}
                  </th>
                  <th className={`text-left ${isMobile ? 'py-3' : 'py-2'} ${isMobile ? typography.mobile.small : typography.desktop.small}`}>Type</th>
                  <th className={`text-left ${isMobile ? 'py-3' : 'py-2'} ${isMobile ? typography.mobile.small : typography.desktop.small}`}>Amount</th>
                  <th className={`text-left ${isMobile ? 'py-3' : 'py-2'} ${isMobile ? typography.mobile.small : typography.desktop.small}`}>Status</th>
                  {!isMobile && <th className={`text-left py-2 ${typography.desktop.small}`}>Date</th>}
                </tr>
              </thead>
              <tbody>
                {recentBills.map((bill) => (
                  <tr key={bill.id} className="border-b">
                    <td className={`${isMobile ? 'py-3' : 'py-2'} font-mono ${isMobile ? typography.mobile.caption : typography.desktop.small}`}>
                      {isMobile ? bill.id.split('-')[2] : bill.id}
                    </td>
                    <td className={`${isMobile ? 'py-3' : 'py-2'} ${isMobile ? typography.mobile.small : typography.desktop.body}`}>
                      {isMobile ? bill.type.split(' ')[0] : bill.type}
                    </td>
                    <td className={`${isMobile ? 'py-3' : 'py-2'} ${isMobile ? typography.mobile.small : typography.desktop.body}`}>${bill.amount}</td>
                    <td className={`${isMobile ? 'py-3' : 'py-2'}`}>
                      <Badge 
                        variant={
                          bill.status === 'Paid' ? 'default' : 
                          bill.status === 'Overdue' ? 'destructive' : 
                          'secondary'
                        }
                        className={isMobile ? 'text-xs px-2 py-1' : ''}
                      >
                        {bill.status}
                      </Badge>
                    </td>
                    {!isMobile && <td className={`py-2 ${typography.desktop.small} text-muted-foreground`}>{bill.date}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </div>
    </ResponsiveContainer>
  );
};

export default MunicipalDashboard;