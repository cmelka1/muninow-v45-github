import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PayTaxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PayTaxDialog: React.FC<PayTaxDialogProps> = ({
  open,
  onOpenChange
}) => {
  console.log('PayTaxDialog rendering with open:', open);

  const handleClose = () => {
    console.log('PayTaxDialog closing');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Tax</DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          <p>This is a simple test dialog to verify functionality.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Dialog is open: {open ? 'Yes' : 'No'}
          </p>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};