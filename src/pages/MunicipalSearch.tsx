import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMunicipalSearch, MunicipalSearchFilters } from '@/hooks/useMunicipalSearch';
import MunicipalSearchFilter from '@/components/MunicipalSearchFilter';
import MunicipalSearchTable from '@/components/MunicipalSearchTable';
import { useDebounce } from '@/hooks/useDebounce';

const MunicipalSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<MunicipalSearchFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: searchResults, isLoading, error } = useMunicipalSearch({
    searchTerm: debouncedSearchTerm,
    filters,
    page: currentPage,
    pageSize,
  });

  // Reset to first page when search term or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleSearch = () => {
    // Force immediate search by setting the search term
    // This bypasses the debounce for instant results
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Municipal Search
        </h1>
        <p className="text-muted-foreground">
          Search for residents and businesses with municipal service records
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Search Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by name, business name, address, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button className="px-6" onClick={handleSearch}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <MunicipalSearchFilter 
        filters={filters} 
        onFiltersChange={setFilters} 
      />

      {/* Results Table */}
      <MunicipalSearchTable
        data={searchResults?.data}
        isLoading={isLoading}
        error={error}
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={searchResults?.count || 0}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
};

export default MunicipalSearch;