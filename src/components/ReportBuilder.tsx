import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileBarChart, 
  Calendar, 
  Users, 
  Clock, 
  Mail, 
  Download,
  X,
  Plus
} from 'lucide-react';

interface ReportBuilderProps {
  children: React.ReactNode;
}

const ReportBuilder = ({ children }: ReportBuilderProps) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [timePeriod, setTimePeriod] = useState('1month');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [recipients, setRecipients] = useState<string[]>(['mayor@city.gov']);
  const [newRecipient, setNewRecipient] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const reportMetrics = [
    { id: 'total-revenue', label: 'Total Revenue', category: 'Revenue Metrics' },
    { id: 'collection-rate', label: 'Collection Rate', category: 'Revenue Metrics' },
    { id: 'permits-issued', label: 'Permits Issued', category: 'Service Metrics' },
    { id: 'licenses-issued', label: 'Business Licenses Issued', category: 'Service Metrics' },
    { id: 'applications-by-status', label: 'Applications by Status', category: 'Service Analytics' },
    { id: 'payment-methods', label: 'Payment Methods', category: 'Service Analytics' },
    { id: 'service-types', label: 'Service Types Distribution', category: 'Service Analytics' },
    { id: 'department-performance', label: 'Department Performance', category: 'Department Analytics' },
    { id: 'growth-rates', label: 'Growth Rates', category: 'Department Analytics' },
    { id: 'monthly-trends', label: 'Monthly Revenue Trends', category: 'Financial Trends' },
    { id: 'seasonal-patterns', label: 'Seasonal Patterns', category: 'Financial Trends' },
    { id: 'online-adoption', label: 'Online Payment Adoption', category: 'Citizen Engagement' },
    { id: 'processing-times', label: 'Application Processing Times', category: 'System Performance' },
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

  const generateDummyData = (metricId: string) => {
    const timeLabels = {
      '1week': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      '1month': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      '3months': ['Month 1', 'Month 2', 'Month 3'],
      '1year': ['Q1', 'Q2', 'Q3', 'Q4']
    };

    switch (metricId) {
      case 'total-revenue':
        return {
          title: 'Total Revenue',
          type: 'table',
          data: timeLabels[timePeriod as keyof typeof timeLabels].map((period, i) => ({
            period,
            revenue: `$${(15000 + i * 2000).toLocaleString()}`,
            change: i > 0 ? `+${(5 + i * 2)}%` : '-'
          }))
        };
      case 'collection-rate':
        return {
          title: 'Collection Rate',
          type: 'table',
          data: timeLabels[timePeriod as keyof typeof timeLabels].map((period, i) => ({
            period,
            rate: `${85 + i * 2}%`,
            collected: `$${(12000 + i * 1500).toLocaleString()}`,
            outstanding: `$${(3000 - i * 200).toLocaleString()}`
          }))
        };
      case 'permits-issued':
        return {
          title: 'Permits Issued',
          type: 'table',
          data: [
            { department: 'Building Permits', count: 156, amount: '$245,230' },
            { department: 'Electrical Permits', count: 89, amount: '$95,400' },
            { department: 'Plumbing Permits', count: 134, amount: '$128,750' },
            { department: 'Mechanical Permits', count: 203, amount: '$175,600' }
          ]
        };
      case 'licenses-issued':
        return {
          title: 'Business Licenses Issued',
          type: 'table',
          data: [
            { type: 'Restaurant', count: 45, amount: '$67,500' },
            { type: 'Retail', count: 78, amount: '$58,500' },
            { type: 'Professional Services', count: 123, amount: '$92,250' },
            { type: 'Home Business', count: 234, amount: '$35,100' }
          ]
        };
      case 'applications-by-status':
        return {
          title: 'Applications by Status',
          type: 'table',
          data: [
            { status: 'Approved', count: 1250, percentage: '68%' },
            { status: 'Under Review', count: 234, percentage: '13%' },
            { status: 'Pending Documents', count: 189, percentage: '10%' },
            { status: 'Draft', count: 162, percentage: '9%' }
          ]
        };
      case 'payment-methods':
        return {
          title: 'Payment Methods',
          type: 'table',
          data: [
            { method: 'ACH/Bank Transfer', count: 856, percentage: '65%' },
            { method: 'Credit Card', count: 324, percentage: '25%' },
            { method: 'Check', count: 89, percentage: '7%' },
            { method: 'Cash', count: 45, percentage: '3%' }
          ]
        };
      case 'department-performance':
        return {
          title: 'Department Performance',
          type: 'table',
          data: [
            { department: 'Utilities', revenue: '$125,400', growth: '+8%' },
            { department: 'Property Tax', revenue: '$89,200', growth: '+5%' },
            { department: 'Permits', revenue: '$45,600', growth: '+12%' },
            { department: 'Parking', revenue: '$23,800', growth: '+3%' }
          ]
        };
      case 'monthly-trends':
        return {
          title: 'Monthly Revenue Trends',
          type: 'table',
          data: timeLabels[timePeriod as keyof typeof timeLabels].map((period, i) => ({
            period,
            revenue: `$${(25000 + i * 3000).toLocaleString()}`,
            transactions: (450 + i * 50).toString(),
            avgTransaction: `$${(55 + i * 5).toFixed(2)}`
          }))
        };
      case 'processing-times':
        return {
          title: 'Application Processing Times',
          type: 'table',
          data: [
            { metric: 'Average Permit Review', time: '5.2 days' },
            { metric: 'License Application Review', time: '3.8 days' },
            { metric: 'Service Application Processing', time: '2.1 days' },
            { metric: 'Payment Processing', time: '2.3 minutes' }
          ]
        };
      default:
        return {
          title: reportMetrics.find(m => m.id === metricId)?.label || 'Unknown Metric',
          type: 'table',
          data: [
            { item: 'Sample Data 1', value: '100' },
            { item: 'Sample Data 2', value: '200' },
            { item: 'Sample Data 3', value: '150' }
          ]
        };
    }
  };

  const generatePreviewContent = () => {
    if (selectedMetrics.length === 0) {
      return (
        <div className="text-center py-12">
          <FileBarChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Metrics Selected</h3>
          <p className="text-muted-foreground">Select some metrics to preview your report</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center border-b pb-4">
          <h2 className="text-2xl font-bold">Municipal Financial Report</h2>
          <p className="text-muted-foreground">
            Period: {timePeriod === '1week' ? 'Last 7 Days' : 
                     timePeriod === '1month' ? 'Last 30 Days' :
                     timePeriod === '3months' ? 'Last 3 Months' : 'Last 12 Months'}
          </p>
          <p className="text-sm text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
        </div>

        {selectedMetrics.map((metricId) => {
          const data = generateDummyData(metricId);
          return (
            <Card key={metricId}>
              <CardHeader>
                <CardTitle className="text-lg">{data.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(data.data[0] || {}).map((key) => (
                        <TableHead key={key} className="capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((value, cellIndex) => (
                          <TableCell key={cellIndex}>{value as string}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            Custom Report Builder
          </SheetTitle>
          <SheetDescription>
            Create detailed reports for municipal financial data and analytics
          </SheetDescription>
        </SheetHeader>

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
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPreview(true)}
                disabled={selectedMetrics.length === 0}
              >
                Preview Report
              </Button>
              <Button variant="outline" size="sm">
                Save Template
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
            <DialogDescription>
              Preview of your custom report with {selectedMetrics.length} selected metrics
            </DialogDescription>
          </DialogHeader>
          {generatePreviewContent()}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default ReportBuilder;