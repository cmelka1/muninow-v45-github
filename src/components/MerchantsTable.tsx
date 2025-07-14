import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMerchants } from '@/hooks/useMerchants';
import { useAuth } from '@/contexts/AuthContext';

export const MerchantsTable: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { fetchMerchantsByCustomer, isLoading, error } = useMerchants();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    const loadMerchants = async () => {
      if (!profile?.customer_id) return;

      try {
        const result = await fetchMerchantsByCustomer(profile.customer_id, currentPage, pageSize);
        setMerchants(result.data || []);
        setTotalCount(result.count || 0);
      } catch (err) {
        console.error('Error loading merchants:', err);
        setMerchants([]);
        setTotalCount(0);
      }
    };

    loadMerchants();
  }, [profile?.customer_id, currentPage, pageSize]);

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const formatBankAccount = (bankLastFour: string | null) => {
    if (!bankLastFour) return 'Not provided';
    return `Bank Account ••••${bankLastFour}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Merchants ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(pageSize)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Merchants</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading merchants. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  if (!merchants || merchants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Merchants (0)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No merchants found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Merchants ({totalCount})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Merchant Name</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Subcategory</TableHead>
                <TableHead className="hidden sm:table-cell">Bank Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchants.map((merchant) => (
                <TableRow 
                  key={merchant.id} 
                  className="h-12 hover:bg-muted/50 cursor-pointer" 
                  onClick={() => navigate(`/municipal/merchants/${merchant.id}`)}
                >
                  <TableCell className="py-2">
                    <span className="truncate block max-w-[200px]" title={merchant.merchant_name}>
                      {merchant.merchant_name}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <span className="truncate block max-w-[150px]" title={merchant.category || 'Not specified'}>
                      {merchant.category || 'Not specified'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-2">
                    <span className="truncate block max-w-[150px]" title={merchant.subcategory || 'Not specified'}>
                      {merchant.subcategory || 'Not specified'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-2">
                    <span className="text-muted-foreground text-sm">
                      {formatBankAccount(merchant.bank_last_four)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Show:</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="h-8 px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-sm font-medium px-2">
              {currentPage}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="h-8 px-3"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};