import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface TaxSubmissionFilters {
  taxType?: string;
  paymentStatus?: string;
  taxYear?: number;
  periodRange?: string;
}

interface TaxSubmissionsFilterProps {
  filters: TaxSubmissionFilters;
  onFiltersChange: (filters: TaxSubmissionFilters) => void;
}

const TaxSubmissionsFilter: React.FC<TaxSubmissionsFilterProps> = ({ filters, onFiltersChange }) => {
  const taxTypeOptions = [
    { value: 'food_beverage', label: 'Food & Beverage' },
    { value: 'hotel_motel', label: 'Hotel & Motel' },
    { value: 'amusement', label: 'Amusement' },
  ];

  const periodRangeOptions = [
    { value: 'current_year', label: 'Current Year' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'last_6_months', label: 'Last 6 Months' },
    { value: 'all_time', label: 'All Time' },
  ];

  const currentYear = new Date().getFullYear();
  const taxYearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: currentYear - i,
    label: (currentYear - i).toString(),
  }));

  const updateFilter = (key: keyof TaxSubmissionFilters, value: string | number | undefined) => {
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
          <CardTitle className="text-lg font-medium">Filter Tax Submissions</CardTitle>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Tax Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Tax Type</label>
            <Select value={filters.taxType || 'all'} onValueChange={(value) => updateFilter('taxType', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tax Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {taxTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tax Year */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Tax Year</label>
            <Select value={filters.taxYear?.toString() || 'all'} onValueChange={(value) => updateFilter('taxYear', value === 'all' ? undefined : parseInt(value))}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tax Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {taxYearOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Period</label>
            <Select value={filters.periodRange || 'all'} onValueChange={(value) => updateFilter('periodRange', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {periodRangeOptions.map((option) => (
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

export default TaxSubmissionsFilter;