import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useMunicipalSearchFilterOptions, MunicipalSearchFilters } from '@/hooks/useMunicipalSearch';

interface MunicipalSearchFilterProps {
  filters: MunicipalSearchFilters;
  onFiltersChange: (filters: MunicipalSearchFilters) => void;
}

const MunicipalSearchFilter: React.FC<MunicipalSearchFilterProps> = ({ 
  filters, 
  onFiltersChange 
}) => {
  const { data: filterOptions, isLoading } = useMunicipalSearchFilterOptions();

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

  const accountTypeOptions = [
    { value: 'resident', label: 'Residents' },
    { value: 'business', label: 'Businesses' },
  ];

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Account Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Account Type</label>
            <Select value={filters.accountType || 'all'} onValueChange={(value) => updateFilter('accountType', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Account Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {accountTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service-focused filters only - legacy bill system removed */}

          {/* Merchant Filter */}
          <div className="hidden sm:block space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Merchant</label>
            <Select value={filters.merchantId || 'all'} onValueChange={(value) => updateFilter('merchantId', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Merchant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Merchants</SelectItem>
                {isLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  (filterOptions?.merchants || []).map((merchant) => (
                    <SelectItem key={merchant.id} value={merchant.id}>
                      {merchant.merchant_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="hidden sm:block space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Category</label>
            <Select value={filters.category || 'all'} onValueChange={(value) => updateFilter('category', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {isLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  (filterOptions?.categories || []).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory Filter */}
          <div className="hidden sm:block space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Subcategory</label>
            <Select value={filters.subcategory || 'all'} onValueChange={(value) => updateFilter('subcategory', value)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subcategories</SelectItem>
                {isLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  (filterOptions?.subcategories || []).map((subcategory) => (
                    <SelectItem key={subcategory} value={subcategory}>
                      {subcategory}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Filter */}
          <div className="hidden lg:block space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Amount Range</label>
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

export default MunicipalSearchFilter;