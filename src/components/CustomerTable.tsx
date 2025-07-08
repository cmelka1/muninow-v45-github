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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AddCustomerDialog } from '@/components/AddCustomerDialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Customer {
  customer_id: string;
  legal_entity_name: string;
  entity_type: string;
  status: string;
  created_at: string;
  first_name: string;
  last_name: string;
  work_email: string;
}

interface CustomerTableProps {
  onAddCustomer?: () => void;
}

const CustomerTable: React.FC<CustomerTableProps> = ({ onAddCustomer }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('customer_id, legal_entity_name, entity_type, status, created_at, first_name, last_name, work_email')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };
  
  const totalCount = customers.length;
  const totalPages = Math.ceil(totalCount / pageSize);

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
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead className="w-[120px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    <span className="text-muted-foreground">
                      No customers found. Click "Add Customer" to get started.
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                customers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((customer) => (
                  <TableRow key={customer.customer_id} className="h-12">
                    <TableCell className="py-2">
                      <div>
                        <div className="font-medium truncate max-w-[200px]">
                          {customer.legal_entity_name}
                        </div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {customer.first_name} {customer.last_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2">
                      <span className="truncate block max-w-[150px]">
                        {customer.work_email}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2">
                      <span className="truncate block max-w-[150px]">
                        {customer.entity_type.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-2">
                      <Badge variant={customer.status === 'pending' ? 'secondary' : 'default'}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-2">
                      {format(new Date(customer.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-center py-2">
                      <Button size="sm" variant="outline" className="w-full h-8">
                        View
                      </Button>
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
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            fetchCustomers(); // Refresh data when dialog closes
          }
        }}
      />
    </Card>
  );
};

export default CustomerTable;