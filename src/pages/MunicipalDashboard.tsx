import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer as RechartsResponsiveContainer, Area, AreaChart, LineChart, Line } from 'recharts';
import ReportBuilder from '@/components/ReportBuilder';
import ResponsiveContainer from '@/components/ui/responsive-container';
import ResponsiveTypography from '@/components/ui/responsive-typography';
import { useResponsiveNavigation } from '@/hooks/useResponsiveNavigation';
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  Building2,
  CreditCard,
  FileBarChart,
  Activity,
  Target,
  Calendar,
  Bell,
  Users
} from 'lucide-react';

// Enhanced responsive data
const revenueMetrics = {
  total: 18800000,
  monthly: 3200000,
  growth: 12.5,
  target: 20000000
};

const collectionMetrics = {
  rate: 92.8,
  improvement: 1.2,
  totalBills: 73500,
  overdue: 156
};

const monthlyTrend = [
  { month: 'Jan', revenue: 2850000, collection: 92, bills: 12300 },
  { month: 'Feb', revenue: 2620000, collection: 89, bills: 11800 },
  { month: 'Mar', revenue: 3100000, collection: 94, bills: 13200 },
  { month: 'Apr', revenue: 2950000, collection: 91, bills: 12900 },
  { month: 'May', revenue: 3350000, collection: 96, bills: 14100 },
  { month: 'Jun', revenue: 3200000, collection: 93, bills: 13600 },
];

const departmentBreakdown = [
  { department: 'Property Tax', revenue: 8500000, percentage: 45, color: 'hsl(var(--primary))' },
  { department: 'Utilities', revenue: 3200000, percentage: 17, color: 'hsl(var(--secondary))' },
  { department: 'Transportation', revenue: 2100000, percentage: 11, color: 'hsl(var(--accent))' },
  { department: 'Planning', revenue: 1800000, percentage: 10, color: 'hsl(var(--chart-1))' },
  { department: 'Other', revenue: 3200000, percentage: 17, color: 'hsl(var(--chart-2))' },
];

const paymentAnalytics = [
  { method: 'Online Payment', count: 45600, percentage: 62, color: 'hsl(var(--primary))' },
  { method: 'ACH Transfer', count: 18200, percentage: 25, color: 'hsl(var(--secondary))' },
  { method: 'In-Person', count: 7300, percentage: 10, color: 'hsl(var(--accent))' },
  { method: 'Phone Payment', count: 2200, percentage: 3, color: 'hsl(var(--chart-1))' },
];

const recentTransactions = [
  { id: 'T-2024-001', customer: 'John Smith', department: 'Property Tax', amount: 2450, type: 'Payment', date: '2024-01-15', status: 'Completed' },
  { id: 'T-2024-002', customer: 'Mary Johnson', department: 'Transportation', amount: 75, type: 'Fine', date: '2024-01-14', status: 'Pending' },
  { id: 'T-2024-003', customer: 'ABC Corp', department: 'Planning', amount: 150, type: 'License', date: '2024-01-14', status: 'Completed' },
  { id: 'T-2024-004', customer: 'David Wilson', department: 'Utilities', amount: 89, type: 'Bill', date: '2024-01-13', status: 'Completed' },
  { id: 'T-2024-005', customer: 'Sarah Davis', department: 'Property Tax', amount: 500, type: 'Permit', date: '2024-01-13', status: 'Processing' },
  { id: 'T-2024-006', customer: 'Tech Solutions', department: 'Planning', amount: 300, type: 'License', date: '2024-01-12', status: 'Completed' },
];

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
  collection: { label: "Collection Rate", color: "hsl(var(--secondary))" },
  department: { label: "Department", color: "hsl(var(--accent))" },
};

const MunicipalDashboard = () => {
  const { isMobile } = useResponsiveNavigation();

  return (
    <ResponsiveContainer variant="section" maxWidth="full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <ResponsiveTypography variant="h1" className="text-foreground">
          Municipal Dashboard
        </ResponsiveTypography>
        <ReportBuilder>
          <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
            <FileBarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Create Report</span>
            <span className="sm:hidden">Report</span>
          </Button>
        </ReportBuilder>
      </div>

      {/* Responsive Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
        
        {/* Key Metrics - Top Priority */}
        <Card className="md:col-span-2 xl:col-span-2 2xl:col-span-2 min-h-[280px] md:min-h-[350px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <ResponsiveTypography variant="h3" className="text-foreground">
                Revenue Overview
              </ResponsiveTypography>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center lg:text-left">
                <ResponsiveTypography variant="h4" className="text-primary">
                  ${(revenueMetrics.total / 1000000).toFixed(1)}M
                </ResponsiveTypography>
                <ResponsiveTypography variant="small" className="text-muted-foreground">
                  Total Revenue
                </ResponsiveTypography>
              </div>
              <div className="text-center lg:text-left">
                <ResponsiveTypography variant="h4" className="text-secondary">
                  +{revenueMetrics.growth}%
                </ResponsiveTypography>
                <ResponsiveTypography variant="small" className="text-muted-foreground">
                  Growth Rate
                </ResponsiveTypography>
              </div>
              <div className="text-center lg:text-left">
                <ResponsiveTypography variant="h4" className="text-foreground">
                  {collectionMetrics.rate}%
                </ResponsiveTypography>
                <ResponsiveTypography variant="small" className="text-muted-foreground">
                  Collection Rate
                </ResponsiveTypography>
              </div>
              <div className="text-center lg:text-left">
                <ResponsiveTypography variant="h4" className="text-foreground">
                  {collectionMetrics.totalBills.toLocaleString()}
                </ResponsiveTypography>
                <ResponsiveTypography variant="small" className="text-muted-foreground">
                  Bills Processed
                </ResponsiveTypography>
              </div>
            </div>
            <ChartContainer config={chartConfig} className="h-[180px] md:h-[220px]">
              <RechartsResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    fontSize={isMobile ? 10 : 12}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} 
                    fontSize={isMobile ? 10 : 12}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </RechartsResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Collection Performance */}
        <Card className="md:col-span-1 xl:col-span-1 2xl:col-span-1 min-h-[280px] md:min-h-[350px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <ResponsiveTypography variant="h4" className="text-foreground">
                Collection Performance
              </ResponsiveTypography>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] md:h-[250px]">
              <RechartsResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    fontSize={isMobile ? 10 : 12}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    domain={[85, 100]} 
                    fontSize={isMobile ? 10 : 12}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="collection" 
                    fill="hsl(var(--secondary))" 
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </RechartsResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Alerts - High Priority on Mobile */}
        <Card className="md:col-span-1 xl:col-span-1 2xl:col-span-1 min-h-[280px] md:min-h-[350px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <ResponsiveTypography variant="h4" className="text-foreground">
                System Alerts
              </ResponsiveTypography>
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <ResponsiveTypography variant="small" className="font-medium">
                  Urgent Alert
                </ResponsiveTypography>
              </div>
              <ResponsiveTypography variant="caption" className="text-muted-foreground">
                {collectionMetrics.overdue} bills are overdue
              </ResponsiveTypography>
            </div>
            
            <div className="space-y-3">
              <ResponsiveTypography variant="small" className="font-medium">
                System Status
              </ResponsiveTypography>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <ResponsiveTypography variant="caption">Payment Processing</ResponsiveTypography>
                  <Badge variant="default">Online</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <ResponsiveTypography variant="caption">System Sync</ResponsiveTypography>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <ResponsiveTypography variant="caption">Data Backup</ResponsiveTypography>
                  <Badge variant="secondary">Running</Badge>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <ResponsiveTypography variant="h5" className="text-primary">
                    98.5%
                  </ResponsiveTypography>
                  <ResponsiveTypography variant="caption" className="text-muted-foreground">
                    Uptime
                  </ResponsiveTypography>
                </div>
                <div>
                  <ResponsiveTypography variant="h5" className="text-foreground">
                    4.2s
                  </ResponsiveTypography>
                  <ResponsiveTypography variant="caption" className="text-muted-foreground">
                    Response
                  </ResponsiveTypography>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department Breakdown */}
        <Card className="md:col-span-2 xl:col-span-2 2xl:col-span-2 min-h-[280px] md:min-h-[400px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <ResponsiveTypography variant="h4" className="text-foreground">
                Department Revenue
              </ResponsiveTypography>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] md:h-[300px]">
              <RechartsResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentBreakdown} layout={isMobile ? "vertical" : "horizontal"}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  {isMobile ? (
                    <>
                      <XAxis type="category" dataKey="department" fontSize={10} />
                      <YAxis type="number" tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} fontSize={10} />
                    </>
                  ) : (
                    <>
                      <XAxis type="number" tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} fontSize={12} />
                      <YAxis type="category" dataKey="department" width={100} fontSize={11} />
                    </>
                  )}
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value) => [`$${(Number(value) / 1000000).toFixed(1)}M`, 'Revenue']}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(var(--accent))" 
                    radius={isMobile ? [2, 2, 0, 0] : [0, 2, 2, 0]}
                  />
                </BarChart>
              </RechartsResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Payment Analytics */}
        <Card className="md:col-span-1 xl:col-span-1 2xl:col-span-1 min-h-[280px] md:min-h-[400px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <ResponsiveTypography variant="h4" className="text-foreground">
                Payment Methods
              </ResponsiveTypography>
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center">
              <ChartContainer config={chartConfig} className="h-[180px] w-[180px]">
                <RechartsResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentAnalytics}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={70}
                      dataKey="percentage"
                    >
                      {paymentAnalytics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value) => [`${value}%`, 'Share']}
                    />
                  </PieChart>
                </RechartsResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="space-y-2">
              {paymentAnalytics.map((method) => (
                <div key={method.method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: method.color }}
                    />
                    <ResponsiveTypography variant="caption">
                      {method.method}
                    </ResponsiveTypography>
                  </div>
                  <ResponsiveTypography variant="caption" className="font-medium">
                    {method.percentage}%
                  </ResponsiveTypography>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Activity */}
        <Card className="md:col-span-1 xl:col-span-1 2xl:col-span-1 min-h-[280px] md:min-h-[400px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <ResponsiveTypography variant="h4" className="text-foreground">
                Daily Activity
              </ResponsiveTypography>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] md:h-[300px]">
              <RechartsResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    fontSize={isMobile ? 10 : 12}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    fontSize={isMobile ? 10 : 12}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="bills" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </RechartsResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Transactions Table - Desktop Full Width, Mobile Stacked */}
        <Card className="col-span-full min-h-[300px] md:min-h-[400px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <ResponsiveTypography variant="h4" className="text-foreground">
                Recent Transactions
              </ResponsiveTypography>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              /* Mobile: Card-based layout */
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {recentTransactions.slice(0, 6).map((transaction) => (
                  <div key={transaction.id} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <ResponsiveTypography variant="small" className="font-medium">
                          {transaction.customer}
                        </ResponsiveTypography>
                        <ResponsiveTypography variant="caption" className="text-muted-foreground">
                          {transaction.department}
                        </ResponsiveTypography>
                      </div>
                      <div className="text-right">
                        <ResponsiveTypography variant="small" className="font-bold">
                          ${transaction.amount}
                        </ResponsiveTypography>
                        <Badge variant={transaction.status === 'Completed' ? 'default' : 'secondary'} className="text-xs">
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <ResponsiveTypography variant="caption" className="text-muted-foreground">
                        {transaction.type} • {transaction.date}
                      </ResponsiveTypography>
                      <ResponsiveTypography variant="caption" className="text-muted-foreground">
                        {transaction.id}
                      </ResponsiveTypography>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Desktop: Traditional table */
              <div className="max-h-[320px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                        <TableCell className="font-medium">{transaction.customer}</TableCell>
                        <TableCell>{transaction.department}</TableCell>
                        <TableCell>{transaction.type}</TableCell>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell className="font-bold">${transaction.amount}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.status === 'Completed' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ResponsiveContainer>
  );
};

export default MunicipalDashboard;