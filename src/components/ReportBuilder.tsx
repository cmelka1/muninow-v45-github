import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { 
  FileBarChart, 
  Calendar, 
  Users, 
  Clock, 
  Mail, 
  Download,
  X,
  Plus,
  DollarSign,
  TrendingUp,
  FileText,
  CheckCircle,
  Eye
} from 'lucide-react';

interface ReportBuilderProps {
  children: React.ReactNode;
}

const ReportBuilder = ({ children }: ReportBuilderProps) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['total-revenue', 'collection-rate']);
  const [timePeriod, setTimePeriod] = useState('1month');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [recipients, setRecipients] = useState<string[]>(['mayor@city.gov']);
  const [newRecipient, setNewRecipient] = useState('');

  const reportMetrics = [
    { id: 'total-revenue', label: 'Total Revenue', category: 'Revenue Metrics' },
    { id: 'collection-rate', label: 'Collection Rate', category: 'Revenue Metrics' },
    { id: 'outstanding-bills', label: 'Outstanding Bills', category: 'Revenue Metrics' },
    { id: 'bills-by-status', label: 'Bills by Status', category: 'Bill Analytics' },
    { id: 'payment-methods', label: 'Payment Methods', category: 'Bill Analytics' },
    { id: 'bill-types', label: 'Bill Types Distribution', category: 'Bill Analytics' },
    { id: 'department-performance', label: 'Department Performance', category: 'Department Analytics' },
    { id: 'growth-rates', label: 'Growth Rates', category: 'Department Analytics' },
    { id: 'monthly-trends', label: 'Monthly Revenue Trends', category: 'Financial Trends' },
    { id: 'seasonal-patterns', label: 'Seasonal Patterns', category: 'Financial Trends' },
    { id: 'online-adoption', label: 'Online Payment Adoption', category: 'Citizen Engagement' },
    { id: 'processing-times', label: 'Processing Times', category: 'System Performance' },
  ];

  const suggestedRecipients = [
    'mayor@city.gov',
    'finance.director@city.gov',
    'city.manager@city.gov',
    'treasurer@city.gov',
    'budget.analyst@city.gov'
  ];

  const groupedMetrics = reportMetrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, typeof reportMetrics>);

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const addRecipient = () => {
    if (newRecipient && !recipients.includes(newRecipient)) {
      setRecipients([...recipients, newRecipient]);
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  // Generate dummy data based on time period
  const generateDummyData = () => {
    const periods = {
      '1week': 7,
      '1month': 30,
      '3months': 90,
      '1year': 365
    };
    
    const days = periods[timePeriod as keyof typeof periods] || 30;
    const dataPoints = Math.min(days, 12); // Max 12 points for readability
    
    return Array.from({ length: dataPoints }, (_, i) => ({
      period: timePeriod === '1year' ? `Month ${i + 1}` : `Day ${i + 1}`,
      revenue: Math.floor(Math.random() * 500000) + 200000,
      bills: Math.floor(Math.random() * 1000) + 500,
      collection: Math.floor(Math.random() * 20) + 80,
      outstanding: Math.floor(Math.random() * 50000) + 10000,
    }));
  };

  const dummyData = generateDummyData();
  
  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--primary))" },
    bills: { label: "Bills", color: "hsl(var(--secondary))" },
    collection: { label: "Collection Rate", color: "hsl(var(--accent))" },
  };

  const paymentMethodsData = [
    { method: 'ACH', value: 45, fill: 'hsl(var(--primary))' },
    { method: 'Card', value: 35, fill: 'hsl(var(--secondary))' },
    { method: 'Cash', value: 20, fill: 'hsl(var(--accent))' },
  ];

  const renderPreviewChart = (metricId: string) => {
    switch (metricId) {
      case 'total-revenue':
        return (
          <Card key={metricId} className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dummyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        );
      
      case 'collection-rate':
        return (
          <Card key={metricId} className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Collection Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dummyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="collection" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        );

      case 'bills-by-status':
        return (
          <Card key={metricId} className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Bills by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dummyData.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="bills" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        );

      case 'payment-methods':
        return (
          <Card key={metricId} className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                      label={({ method, value }) => `${method}: ${value}%`}
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card key={metricId} className="mb-4">
            <CardHeader>
              <CardTitle className="capitalize">
                {reportMetrics.find(m => m.id === metricId)?.label || metricId}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Chart preview for {reportMetrics.find(m => m.id === metricId)?.label}
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[95vw] max-w-[1400px] overflow-hidden p-0">
        <div className="flex h-[calc(100vh-2rem)]">
          {/* Left Panel - Controls */}
          <div className="w-[400px] border-r bg-background p-6 overflow-y-auto">
            <div className="pb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileBarChart className="h-5 w-5" />
                Custom Report Builder
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create detailed reports for municipal financial data and analytics
              </p>
            </div>

            <div className="space-y-6">
          {/* Report Content Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileBarChart className="h-4 w-4" />
                Report Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(groupedMetrics).map(([category, metrics]) => (
                <div key={category} className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    {category}
                  </Label>
                  <div className="space-y-2 pl-2">
                    {metrics.map((metric) => (
                      <div key={metric.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={metric.id}
                          checked={selectedMetrics.includes(metric.id)}
                          onCheckedChange={() => handleMetricToggle(metric.id)}
                        />
                        <Label
                          htmlFor={metric.id}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {metric.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Time Period Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Time Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={timePeriod === '1week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimePeriod('1week')}
                >
                  1 Week
                </Button>
                <Button
                  variant={timePeriod === '1month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimePeriod('1month')}
                >
                  1 Month
                </Button>
                <Button
                  variant={timePeriod === '3months' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimePeriod('3months')}
                >
                  3 Months
                </Button>
                <Button
                  variant={timePeriod === '1year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimePeriod('1year')}
                >
                  1 Year
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="compare-previous"
                  defaultChecked
                />
                <Label htmlFor="compare-previous" className="text-sm">
                  Compare to previous period
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Recurring Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recurring Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                        <Checkbox
                          id="recurring"
                          checked={isRecurring}
                          onCheckedChange={(checked) => setIsRecurring(checked === true)}
                        />
                <Label htmlFor="recurring" className="text-sm">
                  Send recurring reports
                </Label>
              </div>

              {isRecurring && (
                <div className="space-y-3 pl-6">
                  <div>
                    <Label className="text-sm">Frequency</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Start Date</Label>
                    <Input type="date" className="mt-1" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Recipients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email address"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                />
                <Button onClick={addRecipient} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Current Recipients</Label>
                <div className="flex flex-wrap gap-1">
                  {recipients.map((email) => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1">
                      {email}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeRecipient(email)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Suggested Recipients</Label>
                <div className="flex flex-wrap gap-1">
                  {suggestedRecipients
                    .filter(email => !recipients.includes(email))
                    .map((email) => (
                      <Badge 
                        key={email} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => setRecipients([...recipients, email])}
                      >
                        {email}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Format
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm">PDF</Button>
                <Button variant="outline" size="sm">Excel</Button>
                <Button variant="outline" size="sm">CSV</Button>
              </div>
            </CardContent>
          </Card>

          <Separator />

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button className="w-full" disabled={selectedMetrics.length === 0}>
                  <FileBarChart className="h-4 w-4 mr-2" />
                  Generate Report ({selectedMetrics.length} metrics)
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    Save Template
                  </Button>
                  <Button variant="outline" size="sm">
                    Export PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="flex-1 bg-muted/30 p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                See your report as you build it • {timePeriod.replace(/(\d+)/, '$1 ').replace(/(\w)(\w+)/, (_, first, rest) => first.toUpperCase() + rest)}
              </p>
            </div>

            {selectedMetrics.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-center">
                <FileBarChart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Select metrics to preview</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Choose report content from the left panel to see a live preview of your report here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Selected Metrics</p>
                          <p className="text-2xl font-bold">{selectedMetrics.length}</p>
                        </div>
                        <FileBarChart className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Time Period</p>
                          <p className="text-2xl font-bold capitalize">{timePeriod.replace(/(\d+)/, '$1 ')}</p>
                        </div>
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Dynamic Charts */}
                <div className="space-y-4">
                  {selectedMetrics.map(metricId => renderPreviewChart(metricId))}
                </div>

                {/* Report Summary */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Report Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Recipients:</span>
                        <span className="ml-2 font-medium">{recipients.length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Recurring:</span>
                        <span className="ml-2 font-medium">{isRecurring ? frequency : 'One-time'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Charts:</span>
                        <span className="ml-2 font-medium">{selectedMetrics.length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Period:</span>
                        <span className="ml-2 font-medium capitalize">{timePeriod.replace(/(\d+)/, '$1 ')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReportBuilder;