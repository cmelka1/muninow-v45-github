import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { profile } = useAuth();

  // Dynamic permit type options from municipality's available permit types
  const { data: permitTypeOptions = [], isLoading: isLoadingPermitTypes } = useQuery({
    queryKey: ['municipality-permit-types', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      console.log('[PermitsFilter] Fetching municipality permit types for user:', profile.id);
      
      // Step 1: Get user's customer_id from their first permit application
      const { data: userPermit, error: permitError } = await supabase
        .from('permit_applications')
        .select('customer_id')
        .eq('user_id', profile.id)
        .limit(1)
        .single();
        
      if (permitError || !userPermit?.customer_id) {
        console.log('[PermitsFilter] No customer_id found for user, cannot fetch permit types');
        return [];
      }
      
      console.log('[PermitsFilter] Found customer_id:', userPermit.customer_id);
      
      // Step 2: Fetch all active permit types for this municipality
      const { data, error } = await supabase
        .from('municipal_permit_types')
        .select(`
          id,
          municipal_label,
          permit_type_id,
          permit_types(name)
        `)
        .eq('customer_id', userPermit.customer_id)
        .eq('is_active', true)
        .order('municipal_label');
        
      if (error) {
        console.error('[PermitsFilter] Error fetching municipal permit types:', error);
        return [];
      }
      
      // Transform to match expected format
      const permitTypes = data.map(item => {
        const standardName = (item.permit_types as any)?.name || item.municipal_label;
        return {
          value: standardName, // Use standard name for filtering
          label: item.municipal_label, // Display municipal label
          municipalLabel: item.municipal_label,
          municipalPermitTypeId: item.id
        };
      });
      
      console.log('[PermitsFilter] Found municipal permit types:', permitTypes);
      
      return permitTypes;
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'information_requested', label: 'Info Requested' },
    { value: 'resubmitted', label: 'Resubmitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
    { value: 'withdrawn', label: 'Withdrawn' },
    { value: 'expired', label: 'Expired' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'issued', label: 'Issued' },
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
          <CardTitle className="text-lg font-medium">Filter Building Permits</CardTitle>
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
            <Select 
              value={filters.permitType || 'all'} 
              onValueChange={(value) => updateFilter('permitType', value)}
              disabled={isLoadingPermitTypes}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={isLoadingPermitTypes ? "Loading types..." : "Type"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {isLoadingPermitTypes ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : permitTypeOptions.length === 0 ? (
                  <SelectItem value="none" disabled>No permit types found</SelectItem>
                ) : (
                  permitTypeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col items-start">
                        <span>{type.label}</span>
                        {type.municipalLabel && type.municipalLabel !== type.value && (
                          <span className="text-xs text-muted-foreground">
                            Standard: {type.value}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
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