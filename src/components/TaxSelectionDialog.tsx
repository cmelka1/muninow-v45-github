import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTaxSubmissions } from '@/hooks/useTaxSubmissions';

interface TaxSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TaxSelectionDialog: React.FC<TaxSelectionDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  
  const { data, isLoading, error } = useTaxSubmissions({
    page: 1,
    pageSize: 50,
    filters: { paymentStatus: 'pending' }
  });

  const formatAmount = (amountCents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amountCents / 100);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTaxType = (taxType: string): string => {
    return taxType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSelectTax = (taxId: string) => {
    onOpenChange(false);
    navigate(`/tax/${taxId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Select Tax to Pay</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Failed to load tax submissions. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          )}

          {!isLoading && !error && data?.data && data.data.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No unpaid tax submissions found</p>
            </div>
          )}

          {!isLoading && !error && data?.data && data.data.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.data.map((submission) => (
                <Button
                  key={submission.id}
                  variant="outline"
                  className="w-full p-4 h-auto justify-start"
                  onClick={() => handleSelectTax(submission.id)}
                >
                  <div className="flex flex-col items-start space-y-1 w-full">
                    <div className="flex justify-between items-center w-full">
                      <span className="font-medium">
                        {formatTaxType(submission.tax_type)}
                      </span>
                      <span className="font-semibold text-primary">
                        {formatAmount(submission.total_amount_due_cents)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Due: {formatDate(submission.submission_date)}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};