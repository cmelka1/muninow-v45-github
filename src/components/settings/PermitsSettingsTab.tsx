import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useMunicipalPermitTypes, useDeleteMunicipalPermitType } from '@/hooks/useMunicipalPermitTypes';
import { MunicipalPermitTypeDialog } from '@/components/municipal/MunicipalPermitTypeDialog';
import type { MunicipalPermitType } from '@/hooks/useMunicipalPermitTypes';
import { toast } from 'sonner';

export const PermitsSettingsTab = () => {
  const { data: permitTypes, isLoading } = useMunicipalPermitTypes();
  const deleteMutation = useDeleteMunicipalPermitType();
  const [editingPermitType, setEditingPermitType] = useState<MunicipalPermitType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleEdit = (permitType: MunicipalPermitType) => {
    setEditingPermitType(permitType);
    setDialogOpen(true);
  };

  const handleDelete = async (permitType: MunicipalPermitType) => {
    try {
      await deleteMutation.mutateAsync(permitType.id);
      toast.success('Permit type deleted successfully');
    } catch (error) {
      toast.error('Failed to delete permit type');
      console.error('Error deleting permit type:', error);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingPermitType(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Municipal Permit Types</CardTitle>
              <CardDescription>
                Manage permit types available to residents. Customize standard permits or create custom ones.
              </CardDescription>
            </div>
            <MunicipalPermitTypeDialog
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Permit Type
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading permit types...</div>
            </div>
          ) : !permitTypes?.length ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                No permit types configured yet.
              </div>
              <MunicipalPermitTypeDialog
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Permit Type
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Municipal Label</TableHead>
                    <TableHead>Standard Type</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Processing Days</TableHead>
                    <TableHead>Inspection</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permitTypes.map((permitType) => (
                    <TableRow key={permitType.id}>
                      <TableCell className="font-medium">
                        {permitType.municipal_label}
                        {permitType.is_custom && (
                          <Badge variant="secondary" className="ml-2">
                            Custom
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {permitType.permit_types?.name || 'Custom Type'}
                      </TableCell>
                      <TableCell>
                        {permitType.merchant_name || 'No merchant assigned'}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(permitType.base_fee_cents)}
                      </TableCell>
                      <TableCell>
                        {permitType.processing_days} days
                      </TableCell>
                      <TableCell>
                        <Badge variant={permitType.requires_inspection ? 'default' : 'secondary'}>
                          {permitType.requires_inspection ? 'Required' : 'Not Required'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={permitType.is_active ? 'default' : 'secondary'}>
                          {permitType.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(permitType)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(permitType)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <MunicipalPermitTypeDialog
        permitType={editingPermitType}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
      />
    </div>
  );
};