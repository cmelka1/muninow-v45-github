import React, { useState } from 'react';
import { MunicipalLayout } from '@/components/layouts/MunicipalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useMunicipalStatusBreakdown } from '@/hooks/useMunicipalStatusBreakdown';
import { useMunicipalTrendData } from '@/hooks/useMunicipalTrendData';
import { useMunicipalStaffMetrics } from '@/hooks/useMunicipalStaffMetrics';
import { useMunicipalCitizenEngagement } from '@/hooks/useMunicipalCitizenEngagement';
import { useMunicipalRevenue } from '@/hooks/useMunicipalRevenue';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  FileText,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Activity
} from 'lucide-react';

const COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  danger: 'hsl(0, 84%, 60%)',
  info: 'hsl(221, 83%, 53%)',
  muted: 'hsl(var(--muted-foreground))',
};

const MunicipalDashboard = () => {
  const { data: userProfile } = useUserProfile();
  const customerId = userProfile?.customer_id;

  const { data: statusBreakdown, isLoading: statusLoading } = useMunicipalStatusBreakdown(customerId);
  const { data: trendData, isLoading: trendLoading } = useMunicipalTrendData(customerId, 12);
  const { data: staffMetrics, isLoading: staffLoading } = useMunicipalStaffMetrics(customerId);
  const { data: citizenEngagement, isLoading: citizenLoading } = useMunicipalCitizenEngagement(customerId);
  const { data: revenueData, isLoading: revenueLoading } = useMunicipalRevenue(customerId);

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  const isLoading = statusLoading || trendLoading || staffLoading || citizenLoading || revenueLoading;

  if (isLoading) {
    return (
      <MunicipalLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </MunicipalLayout>
    );
  }

  // Calculate KPIs
  const totalApplicationsYTD = 
    (statusBreakdown?.permits.submitted || 0) +
    (statusBreakdown?.permits.under_review || 0) +
    (statusBreakdown?.permits.approved || 0) +
    (statusBreakdown?.permits.issued || 0) +
    (statusBreakdown?.licenses.submitted || 0) +
    (statusBreakdown?.licenses.under_review || 0) +
    (statusBreakdown?.licenses.approved || 0) +
    (statusBreakdown?.licenses.issued || 0) +
    (statusBreakdown?.taxes.submitted || 0) +
    (statusBreakdown?.taxes.under_review || 0) +
    (statusBreakdown?.taxes.approved || 0) +
    (statusBreakdown?.services.submitted || 0) +
    (statusBreakdown?.services.under_review || 0) +
    (statusBreakdown?.services.approved || 0);

  const monthlyRevenue = revenueData?.monthlyTotal || 0;
  const avgProcessingTime = 5.2;
  const activeCitizens = citizenEngagement?.totalActiveUsers || 0;

  // Status pipeline data
  const statusPipelineData = [
    { name: 'Submitted', value: (statusBreakdown?.permits.submitted || 0) + (statusBreakdown?.licenses.submitted || 0) + (statusBreakdown?.services.submitted || 0), fill: COLORS.info },
    { name: 'Under Review', value: (statusBreakdown?.permits.under_review || 0) + (statusBreakdown?.licenses.under_review || 0) + (statusBreakdown?.services.under_review || 0), fill: COLORS.warning },
    { name: 'Info Requested', value: (statusBreakdown?.permits.information_requested || 0) + (statusBreakdown?.licenses.information_requested || 0) + (statusBreakdown?.services.information_requested || 0), fill: COLORS.muted },
    { name: 'Approved', value: (statusBreakdown?.permits.approved || 0) + (statusBreakdown?.licenses.approved || 0) + (statusBreakdown?.services.approved || 0), fill: COLORS.success },
    { name: 'Issued', value: (statusBreakdown?.permits.issued || 0) + (statusBreakdown?.licenses.issued || 0), fill: COLORS.primary },
  ];

  // Service type breakdown
  const serviceBreakdownData = [
    { name: 'Permits', value: Object.values(statusBreakdown?.permits || {}).reduce((a, b) => a + b, 0), fill: COLORS.primary },
    { name: 'Licenses', value: Object.values(statusBreakdown?.licenses || {}).reduce((a, b) => a + b, 0), fill: COLORS.secondary },
    { name: 'Taxes', value: Object.values(statusBreakdown?.taxes || {}).reduce((a, b) => a + b, 0), fill: COLORS.success },
    { name: 'Services', value: Object.values(statusBreakdown?.services || {}).reduce((a, b) => a + b, 0), fill: COLORS.info },
  ];

  return (
    <MunicipalLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Municipal Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Real-time insights and operational metrics
            </p>
          </div>
          <div className="flex gap-2">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 border rounded-md bg-background"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="12m">Last 12 months</option>
            </select>
          </div>
        </div>

        {/* Executive KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalApplicationsYTD.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Year to date</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(monthlyRevenue / 100).toLocaleString()}</div>
              <p className="text-xs text-success mt-1">+{revenueData?.transactionCount || 0} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgProcessingTime.toFixed(1)} days</div>
              <p className="text-xs text-muted-foreground mt-1">Target: 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Citizens</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCitizens.toLocaleString()}</div>
              <p className="text-xs text-success mt-1">+{citizenEngagement?.newUsersThisMonth || 0} this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Review Queue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staffMetrics?.reviewQueue.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{staffMetrics?.totalStaff || 0} staff members</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="staff">Staff & Workload</TabsTrigger>
            <TabsTrigger value="citizens">Citizen Engagement</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Status Pipeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Application Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusPipelineData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="value" fill={COLORS.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Service Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={serviceBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {serviceBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle>12-Month Application Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData?.monthlyApplications || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="permits" stackId="1" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} />
                    <Area type="monotone" dataKey="licenses" stackId="1" stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.6} />
                    <Area type="monotone" dataKey="taxes" stackId="1" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.6} />
                    <Area type="monotone" dataKey="services" stackId="1" stroke={COLORS.info} fill={COLORS.info} fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Building Permits</CardTitle>
                  <FileText className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.values(statusBreakdown?.permits || {}).reduce((a, b) => a + b, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span className="font-medium">{(statusBreakdown?.permits.submitted || 0) + (statusBreakdown?.permits.under_review || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Approved:</span>
                      <span className="font-medium text-success">{statusBreakdown?.permits.approved || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Business Licenses</CardTitle>
                  <FileText className="h-4 w-4 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.values(statusBreakdown?.licenses || {}).reduce((a, b) => a + b, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span className="font-medium">{(statusBreakdown?.licenses.submitted || 0) + (statusBreakdown?.licenses.under_review || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Approved:</span>
                      <span className="font-medium text-success">{statusBreakdown?.licenses.approved || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tax Submissions</CardTitle>
                  <FileText className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.values(statusBreakdown?.taxes || {}).reduce((a, b) => a + b, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span className="font-medium">{(statusBreakdown?.taxes.submitted || 0) + (statusBreakdown?.taxes.under_review || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Approved:</span>
                      <span className="font-medium text-success">{statusBreakdown?.taxes.approved || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Other Services</CardTitle>
                  <FileText className="h-4 w-4 text-info" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.values(statusBreakdown?.services || {}).reduce((a, b) => a + b, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span className="font-medium">{(statusBreakdown?.services.submitted || 0) + (statusBreakdown?.services.under_review || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Approved:</span>
                      <span className="font-medium text-success">{statusBreakdown?.services.approved || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={trendData?.monthlyRevenue || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke={COLORS.success} strokeWidth={2} name="Revenue ($)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Staff Workload Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={staffMetrics?.staffWorkload || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="staffName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="assignedCount" fill={COLORS.warning} name="Assigned" />
                    <Bar dataKey="completedThisMonth" fill={COLORS.success} name="Completed This Month" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Citizens Tab */}
          <TabsContent value="citizens" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Users This Month</CardTitle>
                  <UserCheck className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{citizenEngagement?.newUsersThisMonth || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{citizenEngagement?.applicationCompletionRate || 0}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Communication Activity</CardTitle>
                  <Activity className="h-4 w-4 text-info" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{citizenEngagement?.communicationActivity.comments || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Comments this month</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Users by Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {citizenEngagement?.topUsers.map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {index + 1}
                        </div>
                        <span className="font-medium">{user.userName}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{user.applicationCount} applications</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MunicipalLayout>
  );
};

export default MunicipalDashboard;
