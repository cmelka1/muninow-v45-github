import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type ServiceApplicationStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'information_requested' 
  | 'resubmitted' 
  | 'approved' 
  | 'denied'
  | 'rejected'
  | 'withdrawn' 
  | 'expired'
  | 'issued'
  | 'reserved'
  | 'cancelled';

export const getStatusDisplayName = (status: ServiceApplicationStatus): string => {
  const statusMap: Record<ServiceApplicationStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted', 
    under_review: 'Under Review',
    information_requested: 'Information Requested',
    resubmitted: 'Resubmitted',
    approved: 'Approved',
    denied: 'Denied',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    expired: 'Expired',
    issued: 'Issued',
    reserved: 'Reserved',
    cancelled: 'Cancelled'
  };
  return statusMap[status] || status;
};

export const getStatusDescription = (status: ServiceApplicationStatus): string => {
  const descriptions: Record<ServiceApplicationStatus, string> = {
    draft: 'Application is being prepared',
    submitted: 'Application has been received and is awaiting initial review',
    under_review: 'Application is actively being reviewed by municipal staff',
    information_requested: 'Reviewer has requested additional documentation or clarification from applicant',
    resubmitted: 'Applicant has submitted the requested follow-up information',
    approved: 'Application has been approved and is ready for issuance',
    denied: 'Application was reviewed but did not meet requirements. Explanation provided',
    rejected: 'Application was reviewed but did not meet requirements. Explanation provided',
    withdrawn: 'Applicant has voluntarily withdrawn the application',
    expired: 'Application has been inactive past the allowable time window',
    issued: 'Service has been issued and is active',
    reserved: 'Time slot has been reserved and confirmed with payment',
    cancelled: 'Reservation has been cancelled by municipal staff or applicant'
  };
  return descriptions[status] || '';
};

export const getValidStatusTransitions = (currentStatus: ServiceApplicationStatus, hasTimeSlots?: boolean): ServiceApplicationStatus[] => {
  const baseTransitions: Record<ServiceApplicationStatus, ServiceApplicationStatus[]> = {
    draft: ['submitted'],
    submitted: ['under_review', 'approved', 'rejected', 'withdrawn'],
    under_review: ['information_requested', 'approved', 'rejected'],
    information_requested: ['resubmitted', 'withdrawn', 'expired'],
    resubmitted: ['under_review'],
    approved: hasTimeSlots ? ['reserved', 'cancelled'] : ['issued'],
    denied: [],
    rejected: [],
    withdrawn: [],
    expired: [],
    issued: [],
    reserved: ['cancelled'],
    cancelled: []
  };
  return baseTransitions[currentStatus] || [];
};

export const useServiceApplicationWorkflow = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateApplicationStatus = async (
    applicationId: string, 
    newStatus: ServiceApplicationStatus,
    reason?: string
  ) => {
    setIsUpdating(true);
    try {
      const updateData: Record<string, string | null | undefined> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Add reason fields for specific statuses (aligned with permits/licenses)
      if ((newStatus === 'denied' || newStatus === 'rejected') && reason) {
        updateData.denial_reason = reason;
      }
      if (newStatus === 'information_requested' && reason) {
        updateData.information_request_reason = reason;
      }
      if (newStatus === 'withdrawn' && reason) {
        updateData.withdrawal_reason = reason;
      }

      const { error } = await supabase
        .from('municipal_service_applications')
        .update(updateData)
        .eq('id', applicationId);

      if (error) {
        console.error('Database error details:', error);
        throw error;
      }

      toast({
        title: "Status Updated",
        description: `Application status changed to ${getStatusDisplayName(newStatus)}`,
      });

      return true;
    } catch (error: unknown) {
      console.error('Error updating application status:', error);
      
      let errorMessage = "Failed to update application status";
      const errMsg = error instanceof Error ? error.message : '';
      if (errMsg.includes('check constraint')) {
        errorMessage = "Invalid status transition. Please try a different status.";
      } else if (errMsg) {
        errorMessage = errMsg;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const assignReviewer = async (applicationId: string, reviewerId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('municipal_service_applications')
        .update({ 
          assigned_reviewer_id: reviewerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Reviewer Assigned",
        description: "Application has been assigned to a reviewer",
      });

      return true;
    } catch (error) {
      console.error('Error assigning reviewer:', error);
      toast({
        title: "Error",
        description: "Failed to assign reviewer",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateApplicationStatus,
    assignReviewer,
    isUpdating,
    getStatusDisplayName,
    getStatusDescription,
    getValidStatusTransitions
  };
};