import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useBusinessLicenseTypes } from '@/hooks/useBusinessLicenseTypes';
import { useAuth } from '@/contexts/AuthContext';

export interface BusinessLicenseFilters {
  licenseType?: string;
  status?: string;
  dateRange?: string;
  feeRange?: string;
  category?: string;
}

interface BusinessLicenseFilterProps {
  filters: BusinessLicenseFilters;
  onFiltersChange: (filters: BusinessLicenseFilters) => void;
}

const BusinessLicenseFilter: React.FC<BusinessLicenseFilterProps> = ({
  filters,
  onFiltersChange
}) => {
  const { profile } = useAuth();
  const { data: licenseTypes, isLoading: licenseTypesLoading } = useBusinessLicenseTypes({
    customerId: profile?.customer_id
  });

  const licenseTypeOptions = licenseTypes?.map(type => ({
    value: type.id,
    label: type.name
  })) || [];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'information_requested', label: 'Information Requested' },
    { value: 'resubmitted', label: 'Resubmitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
    { value: 'withdrawn', label: 'Withdrawn' },
    { value: 'expired', label: 'Expired' },
    { value: 'issued', label: 'Issued' },
  ];

  const dateRangeOptions = [
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_3_months', label: 'Last 3 months' },
    { value: 'last_6_months', label: 'Last 6 months' },
    { value: 'last_year', label: 'Last year' },
  ];

  const categoryOptions = [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'retail', label: 'Retail Store' },
    { value: 'office', label: 'Office' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'personal_service', label: 'Personal Service' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'construction', label: 'Construction' },
  ];

  const feeRangeOptions = [
    { value: '0-50', label: '$0 - $50' },
    { value: '51-100', label: '$51 - $100' },
    { value: '101-250', label: '$101 - $250' },
    { value: '251-500', label: '$251 - $500' },
    { value: '500+', label: '$500+' },
  ];

  const updateFilter = (key: keyof BusinessLicenseFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(filter => filter !== undefined);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Filter Business Licenses</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Status - Always visible (Priority 1) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <Select value={filters.status || 'all'} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range - Always visible (Priority 1) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Date Range</label>
            <Select value={filters.dateRange || 'all'} onValueChange={(value) => updateFilter('dateRange', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* License Type - Hidden on mobile (Priority 2) */}
          <div className="hidden sm:block space-y-2">
            <label className="text-sm font-medium text-muted-foreground">License Type</label>
            <Select 
              value={filters.licenseType || 'all'} 
              onValueChange={(value) => updateFilter('licenseType', value)}
              disabled={licenseTypesLoading}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={licenseTypesLoading ? "Loading..." : "Type"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {licenseTypeOptions.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Business Category - Hidden on mobile (Priority 2) */}
          <div className="hidden sm:block space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Category</label>
            <Select value={filters.category || 'all'} onValueChange={(value) => updateFilter('category', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fee Range - Hidden on mobile (Priority 3) */}
          <div className="hidden sm:block space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Fee</label>
            <Select value={filters.feeRange || 'all'} onValueChange={(value) => updateFilter('feeRange', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Fee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fees</SelectItem>
                {feeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessLicenseFilter;