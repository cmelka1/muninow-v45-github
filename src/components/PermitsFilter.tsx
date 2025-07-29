import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface PermitFilters {
  permitType?: string;
  status?: string;
  dateRange?: string;
  feeRange?: string;
  department?: string;
}

interface PermitsFilterProps {
  filters: PermitFilters;
  onFiltersChange: (filters: PermitFilters) => void;
}

const PermitsFilter: React.FC<PermitsFilterProps> = ({ filters, onFiltersChange }) => {
  const permitTypeOptions = [
    { value: 'building', label: 'Building' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'fire', label: 'Fire Safety' },
    { value: 'zoning', label: 'Zoning' },
    { value: 'business', label: 'Business License' },
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
  ];

  const dateRangeOptions = [
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_3_months', label: 'Last 3 months' },
    { value: 'last_6_months', label: 'Last 6 months' },
    { value: 'last_year', label: 'Last year' },
    { value: 'all_time', label: 'All time' },
  ];

  const feeRangeOptions = [
    { value: '0-100', label: '$0 - $100' },
    { value: '101-500', label: '$101 - $500' },
    { value: '501-1000', label: '$501 - $1,000' },
    { value: '1000+', label: '$1,000+' },
  ];

  const departmentOptions = [
    { value: 'building', label: 'Building Department' },
    { value: 'planning', label: 'Planning Department' },
    { value: 'fire', label: 'Fire Department' },
    { value: 'health', label: 'Health Department' },
  ];

  const updateFilter = (key: keyof PermitFilters, value: string | undefined) => {
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
          <CardTitle className="text-lg font-medium">Filter Permits</CardTitle>
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

          {/* Permit Type - Hidden on mobile (Priority 2) */}
          <div className="hidden sm:block space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Permit Type</label>
            <Select value={filters.permitType || 'all'} onValueChange={(value) => updateFilter('permitType', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {permitTypeOptions.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department - Hidden on mobile (Priority 2) */}
          <div className="hidden sm:block space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Department</label>
            <Select value={filters.department || 'all'} onValueChange={(value) => updateFilter('department', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departmentOptions.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
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

export default PermitsFilter;