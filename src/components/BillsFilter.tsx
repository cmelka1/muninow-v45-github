import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useVendorOptions, useCategoryOptions, usePaymentStatusOptions } from '@/hooks/useBillFilterOptions';

export interface BillFilters {
  vendor?: string;
  category?: string;
  paymentStatus?: string;
  dueDateRange?: string;
  amountRange?: string;
}

interface BillsFilterProps {
  filters: BillFilters;
  onFiltersChange: (filters: BillFilters) => void;
}

const BillsFilter: React.FC<BillsFilterProps> = ({ filters, onFiltersChange }) => {
  const { data: vendorOptions = [], isLoading: vendorsLoading } = useVendorOptions();
  const { data: categoryOptions = [], isLoading: categoriesLoading } = useCategoryOptions();
  const { data: statusOptions = [], isLoading: statusLoading } = usePaymentStatusOptions();

  const dueDateOptions = [
    { value: 'next_7_days', label: 'Next 7 days' },
    { value: 'next_30_days', label: 'Next 30 days' },
    { value: 'past_due', label: 'Past due' },
    { value: 'all_time', label: 'All time' },
  ];

  const amountOptions = [
    { value: '0-100', label: '$0 - $100' },
    { value: '101-500', label: '$101 - $500' },
    { value: '501-1000', label: '$501 - $1,000' },
    { value: '1000+', label: '$1,000+' },
  ];

  const updateFilter = (key: keyof BillFilters, value: string | undefined) => {
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
          <CardTitle className="text-lg font-medium">Filter Bills</CardTitle>
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
            <Select value={filters.paymentStatus || 'all'} onValueChange={(value) => updateFilter('paymentStatus', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statusLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date - Always visible (Priority 1) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Due Date</label>
            <Select value={filters.dueDateRange || 'all'} onValueChange={(value) => updateFilter('dueDateRange', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Due Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {dueDateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor - Hidden on mobile (Priority 2) */}
          <div className="hidden sm:block space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Vendor</label>
            <Select value={filters.vendor || 'all'} onValueChange={(value) => updateFilter('vendor', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendorsLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  vendorOptions.map((vendor) => (
                    <SelectItem key={vendor} value={vendor}>
                      {vendor}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Category - Hidden on mobile (Priority 2) */}
          <div className="hidden sm:block space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Category</label>
            <Select value={filters.category || 'all'} onValueChange={(value) => updateFilter('category', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Amount - Hidden on mobile (Priority 3) */}
          <div className="hidden sm:block space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Amount</label>
            <Select value={filters.amountRange || 'all'} onValueChange={(value) => updateFilter('amountRange', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Amount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Amounts</SelectItem>
                {amountOptions.map((option) => (
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

export default BillsFilter;