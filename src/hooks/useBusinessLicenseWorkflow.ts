import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type BusinessLicenseStatus = 
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

export const getStatusDisplayName = (status: BusinessLicenseStatus): string => {
  const statusMap: Record<BusinessLicenseStatus, string> = {
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

export const getStatusDescription = (status: BusinessLicenseStatus): string => {
  const descriptions: Record<BusinessLicenseStatus, string> = {
    draft: 'License application is being prepared',
    submitted: 'Application has been received and is awaiting initial review',
    under_review: 'Application is actively being reviewed by municipal staff',
    information_requested: 'Reviewer has requested additional documentation or clarification from applicant',
    resubmitted: 'Applicant has submitted the requested follow-up information',
    approved: 'License has been approved and is ready for issuance',
    denied: 'Application was reviewed but did not meet requirements. Explanation provided',
    withdrawn: 'Applicant has voluntarily withdrawn the application',
    expired: 'Application has been inactive past the allowable time window',
    rejected: 'Application was rejected during review process',
    issued: 'License has been issued and is active'
  };
  return descriptions[status] || '';
};

export const getValidStatusTransitions = (currentStatus: BusinessLicenseStatus): BusinessLicenseStatus[] => {
  const transitions: Record<BusinessLicenseStatus, BusinessLicenseStatus[]> = {
    draft: ['submitted'],
    submitted: ['under_review', 'approved', 'withdrawn'],
    under_review: ['information_requested', 'approved', 'denied', 'rejected'],
    information_requested: ['resubmitted', 'withdrawn', 'expired'],
    resubmitted: ['under_review'],
    approved: ['issued', 'withdrawn'],
    denied: [],
    withdrawn: [],
    expired: [],
    rejected: [],
    issued: []
  };
  return transitions[currentStatus] || [];
};

export const useBusinessLicenseWorkflow = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateLicenseStatus = async (
    licenseId: string, 
    newStatus: BusinessLicenseStatus,
    reason?: string
  ) => {
    setIsUpdating(true);
    try {
      const updateData: Record<string, string | null | undefined> = {
        application_status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Add reason fields for specific statuses
      if (newStatus === 'denied' && reason) {
        updateData.denial_reason = reason;
      }
      if (newStatus === 'withdrawn' && reason) {
        updateData.reviewer_comments = reason;
      }
      if (newStatus === 'information_requested' && reason) {
        updateData.reviewer_comments = reason;
      }

      const { error } = await supabase
        .from('business_license_applications')
        .update(updateData)
        .eq('id', licenseId);

      if (error) {
        console.error('Database error details:', error);
        throw error;
      }

      toast({
        title: "Status Updated",
        description: `License status changed to ${getStatusDisplayName(newStatus)}`,
      });

      return true;
    } catch (error: unknown) {
      console.error('Error updating license status:', error);
      
      let errorMessage = "Failed to update license status";
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

  const assignReviewer = async (licenseId: string, reviewerId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('business_license_applications')
        .update({ 
          assigned_reviewer_id: reviewerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', licenseId);

      if (error) throw error;

      toast({
        title: "Reviewer Assigned",
        description: "License has been assigned to a reviewer",
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
    updateLicenseStatus,
    assignReviewer,
    isUpdating,
    getStatusDisplayName,
    getStatusDescription,
    getValidStatusTransitions
  };
};