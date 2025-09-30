import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { MunicipalSearchFilters } from '@/hooks/useMunicipalSearch';

interface MunicipalSearchFilterProps {
  filters: MunicipalSearchFilters;
  onFiltersChange: (filters: MunicipalSearchFilters) => void;
}

const MunicipalSearchFilter: React.FC<MunicipalSearchFilterProps> = ({ 
  filters, 
  onFiltersChange 
}) => {
  const updateFilter = (key: keyof MunicipalSearchFilters, value: string | undefined) => {
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
          <CardTitle className="text-lg font-medium">Filter Search Results</CardTitle>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Service Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Service Type</label>
            <Select value={filters.serviceType || 'all'} onValueChange={(value) => updateFilter('serviceType', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="permit">Building Permits</SelectItem>
                <SelectItem value="license">Business Licenses</SelectItem>
                <SelectItem value="tax">Taxes</SelectItem>
                <SelectItem value="service">Services</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <Select value={filters.status || 'all'} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="information_requested">Info Requested</SelectItem>
                <SelectItem value="resubmitted">Resubmitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Date Range</label>
            <Select value={filters.dateRange || 'all_time'} onValueChange={(value) => updateFilter('dateRange', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_time">All Time</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MunicipalSearchFilter;
