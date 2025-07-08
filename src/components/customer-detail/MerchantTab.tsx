import React, { useState } from 'react';
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
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AddMerchantDialog } from './AddMerchantDialog';

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

  const handleAddMerchant = () => {
    setAddMerchantOpen(true);
  };

  const handleMerchantCreated = () => {
    // TODO: Refresh merchant list
    console.log('Merchant created, refreshing list...');
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
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    <span className="text-muted-foreground">
                      No merchants found. Click "Add Merchant" to get started.
                    </span>
                  </TableCell>
                </TableRow>
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
                disabled={true} // Always disabled since there's no data
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