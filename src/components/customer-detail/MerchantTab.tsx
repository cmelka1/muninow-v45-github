import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AddMerchantDialog } from './AddMerchantDialog';
import { useMerchants } from '@/hooks/useMerchants';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Customer {
  customer_id: string;
  legal_entity_name: string;
  entity_type: string;
  doing_business_as: string;
  first_name: string;
  last_name: string;
  work_email: string;
  entity_phone: string;
  business_address_line1: string;
  business_address_line2?: string;
  business_city: string;
  business_state: string;
  business_zip_code: string;
  business_country: string;
  tax_id: string;
  ownership_type: string;
}

interface MerchantTabProps {
  customer: Customer;
}

const MerchantTab: React.FC<MerchantTabProps> = ({ customer }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [addMerchantOpen, setAddMerchantOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();
  
  const { merchants, isLoading, error, fetchMerchantsByCustomer, subscribeToMerchantChanges } = useMerchants();

  const loadMerchants = async () => {
    const result = await fetchMerchantsByCustomer(customer.customer_id, currentPage, pageSize);
    setTotalCount(result.count);
  };

  useEffect(() => {
    loadMerchants();
  }, [customer.customer_id, currentPage, pageSize]);

  useEffect(() => {
    // Set up real-time subscription - we need to get the customer's user_id first
    const setupSubscription = async () => {
      // For now, skip real-time subscription as we'd need customer's user_id
      // This can be enhanced later to include real-time updates
    };
    
    setupSubscription();
  }, [customer.customer_id]);

  const handleAddMerchant = () => {
    setAddMerchantOpen(true);
  };

  const handleMerchantCreated = () => {
    loadMerchants();
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handleMerchantClick = (merchantId: string) => {
    navigate(`/superadmin/customers/${customer.customer_id}/merchants/${merchantId}`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'approved':
      case 'verified':
        return 'default';
      case 'rejected':
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Merchants</CardTitle>
          <Button onClick={handleAddMerchant}>
            <Plus className="h-4 w-4 mr-2" />
            Add Merchant
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Merchant Name</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Processing Type</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center">
                      <span className="text-muted-foreground">Loading merchants...</span>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center">
                      <span className="text-destructive">Error: {error}</span>
                    </TableCell>
                  </TableRow>
                ) : merchants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center">
                      <span className="text-muted-foreground">
                        No merchants found. Click "Add Merchant" to get started.
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  merchants.map((merchant) => (
                    <TableRow 
                      key={merchant.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleMerchantClick(merchant.id)}
                    >
                      <TableCell className="font-medium">
                        {merchant.merchant_name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={getStatusBadgeVariant(merchant.verification_status)}>
                          {merchant.verification_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {merchant.processing_enabled ? 'Enabled' : 'Disabled'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        {formatDate(merchant.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
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
                Page {currentPage} of {totalPages || 1}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages || totalPages === 0}
                className="h-8 px-3"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddMerchantDialog
        open={addMerchantOpen}
        onOpenChange={setAddMerchantOpen}
        customer={customer}
        onMerchantCreated={handleMerchantCreated}
      />
    </>
  );
};

export default MerchantTab;