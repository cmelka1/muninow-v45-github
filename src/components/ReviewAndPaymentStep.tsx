import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Calendar } from "lucide-react";
import ServiceApplicationReviewStep from './ServiceApplicationReviewStep';
import { InlinePaymentFlow } from './payment/InlinePaymentFlow';
import { formatDate } from '@/lib/formatters';
import { format } from 'date-fns';

interface ReviewAndPaymentStepProps {
  tile: any;
  formData: Record<string, any>;
  uploadedDocuments: any[];
  selectedDate: Date | undefined;
  selectedTime: string | null;
  baseAmountCents: number;
  draftApplicationId: string | null;
  isSubmitting: boolean;
  totalAmount: number;
  onEdit: () => void;
  onPrevious: () => void;
  onClose: () => void;
  onSubmitApplication: () => void;
  onPaymentSuccess: (response: any) => void;
  onPaymentError: (error: Error) => void;
  onAddPaymentMethod: () => void;
  onLoadPaymentInstruments: () => void;
}

export const ReviewAndPaymentStep = ({
  tile,
  formData,
  uploadedDocuments,
  selectedDate,
  selectedTime,
  baseAmountCents,
  draftApplicationId,
  isSubmitting,
  totalAmount,
  onEdit,
  onPrevious,
  onClose,
  onSubmitApplication,
  onPaymentSuccess,
  onPaymentError,
  onAddPaymentMethod,
}: ReviewAndPaymentStepProps) => {
  return (
    <>
      <ServiceApplicationReviewStep
        tile={tile}
        formData={formData}
        uploadedDocuments={uploadedDocuments}
        onEdit={onEdit}
      />
      
      {/* Reservation Information - Only for booking appointments */}
      {tile.has_time_slots && selectedDate && selectedTime && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5" />
              Reservation Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Reservation Date
                </Label>
                <p className="text-base font-medium">{formatDate(selectedDate.toISOString())}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  {tile.booking_mode === 'start_time' ? 'Tee Time' : 'Time Slot'}
                </Label>
                <p className="text-base font-medium">
                  {(() => {
                    const startTime = selectedTime;
                    const [hours, minutes] = startTime.split(':').map(Number);
                    const startDate = new Date(2000, 0, 1, hours, minutes);
                    
                    // For 'start_time' mode (tee times), show only start time
                    if (tile.booking_mode === 'start_time') {
                      return format(startDate, 'h:mm a');
                    }
                    
                    // For 'time_period' mode (court bookings), show full range with duration
                    const duration = tile.time_slot_config?.slot_duration_minutes || 60;
                    const endDate = new Date(startDate.getTime() + duration * 60000);
                    return (
                      <>
                        {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                        <span className="text-sm text-muted-foreground ml-2">
                          ({tile.time_slot_config?.slot_duration_minutes} min)
                        </span>
                      </>
                    );
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Conditional Payment or Submit Section */}
      {tile.requires_review ? (
        /* Submit Section for Manual Review Services */
        <>
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <p>Your application will be submitted for manual review by municipal staff.</p>
                {tile.requires_payment && totalAmount > 0 && (
                  <p>Payment will be processed after your application is approved.</p>
                )}
                <p>You will receive notifications about your application status via email.</p>
              </div>
            </CardContent>
          </Card>

          {/* Navigation & Submit Actions */}
          <div className="flex justify-between pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onPrevious}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={onSubmitApplication}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </div>
        </>
      ) : tile.requires_payment ? (
        /* Payment Section for Auto-Approve Services that require payment */
        <div className="mt-8 space-y-6">
          {/* Payment Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Complete Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <InlinePaymentFlow
                entityType="service_application"
                entityId={draftApplicationId || ''}
                entityName={tile.title}
                customerId={tile.customer_id}
                merchantId={tile.merchant_id}
                baseAmountCents={baseAmountCents}
                initialExpanded={true}
                onPaymentSuccess={onPaymentSuccess}
                onPaymentError={onPaymentError}
                onAddPaymentMethod={onAddPaymentMethod}
              />
            </CardContent>
          </Card>

          {/* Navigation Actions */}
          <div className="flex justify-between pt-6 bg-muted/20 -mx-6 px-6 -mb-6 pb-6 rounded-b-lg">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onPrevious}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex items-center gap-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* Simple Submit Section for No-Payment, No-Review Services */
        <>
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">Ready to Submit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <p>Your application will be submitted and processed automatically.</p>
                <p>You will receive a confirmation notification via email.</p>
              </div>
            </CardContent>
          </Card>

          {/* Navigation & Submit Actions */}
          <div className="flex justify-between pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onPrevious}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={onSubmitApplication}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
