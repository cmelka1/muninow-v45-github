import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type PermitStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'information_requested' 
  | 'resubmitted' 
  | 'approved' 
  | 'denied' 
  | 'withdrawn' 
  | 'expired'
  | 'rejected'
  | 'issued';

export const getStatusDisplayName = (status: PermitStatus): string => {
  const statusMap: Record<PermitStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted', 
    under_review: 'Under Review',
    information_requested: 'Information Requested',
    resubmitted: 'Resubmitted',
    approved: 'Approved',
    denied: 'Denied',
    withdrawn: 'Withdrawn',
    expired: 'Expired',
    rejected: 'Rejected',
    issued: 'Issued'
  };
  return statusMap[status] || status;
};

export const getStatusDescription = (status: PermitStatus): string => {
  const descriptions: Record<PermitStatus, string> = {
    draft: 'Application is being prepared',
    submitted: 'Application has been received and is awaiting initial review',
    under_review: 'Application is actively being reviewed by municipal staff',
    information_requested: 'Reviewer has requested additional documentation or clarification from applicant',
    resubmitted: 'Applicant has submitted the requested follow-up information',
    approved: 'Permit has been approved and is ready for issuance',
    denied: 'Application was reviewed but did not meet requirements. Explanation provided',
    withdrawn: 'Applicant has voluntarily withdrawn the application',
    expired: 'Application has been inactive past the allowable time window',
    rejected: 'Application was rejected during review process',
    issued: 'Permit has been issued and is active'
  };
  return descriptions[status] || '';
};

export const getValidStatusTransitions = (currentStatus: PermitStatus): PermitStatus[] => {
  const transitions: Record<PermitStatus, PermitStatus[]> = {
    draft: ['submitted'],
    submitted: ['approved', 'under_review', 'withdrawn'],
    under_review: ['information_requested', 'approved', 'denied', 'rejected'],
    information_requested: ['resubmitted', 'withdrawn', 'expired'],
    resubmitted: ['under_review'],
    approved: ['issued'],
    denied: [],
    withdrawn: [],
    expired: [],
    rejected: [],
    issued: []
  };
  return transitions[currentStatus] || [];
};

// Map application status to valid municipal review status
const mapToMunicipalReviewStatus = (applicationStatus: PermitStatus): string => {
  const statusMap: Record<PermitStatus, string> = {
    draft: 'pending',
    submitted: 'pending',
    under_review: 'under_review',
    information_requested: 'needs_revision',
    resubmitted: 'under_review',
    approved: 'approved',
    denied: 'rejected',
    withdrawn: 'rejected',
    expired: 'rejected',
    rejected: 'rejected',
    issued: 'approved'
  };
  return statusMap[applicationStatus] || 'pending';
};

export const usePermitWorkflow = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updatePermitStatus = async (
    permitId: string, 
    newStatus: PermitStatus,
    reason?: string
  ) => {
    setIsUpdating(true);
    try {
      const updateData: Record<string, string | null | undefined> = {
        application_status: newStatus,
        municipal_review_status: mapToMunicipalReviewStatus(newStatus),
        updated_at: new Date().toISOString()
      };

      // Add reason fields for specific statuses
      if (newStatus === 'denied' && reason) {
        updateData.denial_reason = reason;
      }
      if (newStatus === 'withdrawn' && reason) {
        updateData.withdrawal_reason = reason;
      }
      if (newStatus === 'information_requested' && reason) {
        updateData.information_request_reason = reason;
      }

      const { error } = await supabase
        .from('permit_applications')
        .update(updateData)
        .eq('permit_id', permitId);

      if (error) {
        console.error('Database error details:', error);
        throw error;
      }

      toast({
        title: "Status Updated",
        description: `Permit status changed to ${getStatusDisplayName(newStatus)}`,
      });

      return true;
    } catch (error: unknown) {
      console.error('Error updating permit status:', error);
      
      let errorMessage = "Failed to update permit status";
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

  const assignReviewer = async (permitId: string, reviewerId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('permit_applications')
        .update({ 
          assigned_reviewer_id: reviewerId,
          updated_at: new Date().toISOString()
        })
        .eq('permit_id', permitId);

      if (error) throw error;

      toast({
        title: "Reviewer Assigned",
        description: "Permit has been assigned to a reviewer",
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
    updatePermitStatus,
    assignReviewer,
    isUpdating,
    getStatusDisplayName,
    getStatusDescription,
    getValidStatusTransitions
  };
};