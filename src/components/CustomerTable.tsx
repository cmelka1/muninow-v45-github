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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AddCustomerDialog } from '@/components/AddCustomerDialog';
import { useCustomers } from '@/hooks/useCustomers';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface CustomerTableProps {
  onAddCustomer?: () => void;
}

const CustomerTable: React.FC<CustomerTableProps> = ({ onAddCustomer }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [customersData, setCustomersData] = useState<{ data: any[], count: number }>({ data: [], count: 0 });
  
  const { fetchCustomers, isLoading, error } = useCustomers();
  const navigate = useNavigate();

  const handleRowClick = (customerId: string) => {
    navigate(`/superadmin/customers/${customerId}`);
  };
  
  const customers = customersData.data;
  const totalCount = customersData.count;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Load customers on component mount and when pagination changes
  useEffect(() => {
    const loadCustomers = async () => {
      const result = await fetchCustomers(currentPage, pageSize);
      setCustomersData(result);
    };
    loadCustomers();
  }, [currentPage, pageSize]);

  const handleCustomerAdded = async () => {
    // Refresh the customers list
    const result = await fetchCustomers(currentPage, pageSize);
    setCustomersData(result);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Customers</CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Customers</CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading customers. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Customers</CardTitle>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="hidden sm:table-cell text-center">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    <span className="text-muted-foreground">
                      No customers found. Click "Add Customer" to get started.
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow 
                    key={customer.customer_id} 
                    className="h-12 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(customer.customer_id)}
                  >
                    <TableCell className="py-2">
                      <span className="truncate block max-w-[200px]" title={customer.legal_entity_name}>
                        {customer.legal_entity_name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2">
                      <span className="truncate block max-w-[150px]" title={customer.entity_type}>
                        {customer.entity_type}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-2">
                      {getStatusBadge(customer.status)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-2 text-center">
                      {format(new Date(customer.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls - only show if there are customers */}
        {customers.length > 0 && (
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
        )}
      </CardContent>
      
      <AddCustomerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleCustomerAdded}
      />
    </Card>
  );
};

export default CustomerTable;