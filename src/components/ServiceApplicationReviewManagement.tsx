import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ServiceApplicationStatusChangeDialog } from '@/components/ServiceApplicationStatusChangeDialog';
import { useServiceApplicationComments, useCreateServiceApplicationComment } from '@/hooks/useServiceApplicationComments';
import { useMunicipalTeamMembers } from '@/hooks/useMunicipalTeamMembers';
import { useServiceApplicationWorkflow, ServiceApplicationStatus, getStatusDisplayName, getStatusDescription } from '@/hooks/useServiceApplicationWorkflow';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Users, Calendar, MessageSquare, Send, User, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceApplicationReviewManagementProps {
  application: any;
  onStatusChange: () => void;
}

export const ServiceApplicationReviewManagement: React.FC<ServiceApplicationReviewManagementProps> = ({
  application,
  onStatusChange
}) => {
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [internalComment, setInternalComment] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  
  const { profile } = useAuth();
  const { members: teamMembers } = useMunicipalTeamMembers();
  const { data: comments } = useServiceApplicationComments(application?.id);
  const { mutate: createComment } = useCreateServiceApplicationComment();
  const { assignReviewer, isUpdating } = useServiceApplicationWorkflow();

  const isMunicipalUser = profile?.account_type?.startsWith('municipal');

  // Filter for internal comments only
  const internalComments = comments?.filter(comment => comment.is_internal) || [];

  const handleAssignReviewer = async (reviewerId: string) => {
    const success = await assignReviewer(application.id, reviewerId);
    if (success) {
      onStatusChange();
      toast.success('Reviewer assigned successfully');
    }
  };

  const handleAddInternalNote = async () => {
    if (!internalComment.trim()) return;

    setIsSubmittingNote(true);
    try {
      await createComment({
        application_id: application.id,
        comment_text: internalComment.trim(),
        is_internal: true
      });
      
      setInternalComment('');
      toast.success('Internal note added successfully');
    } catch (error) {
      console.error('Error creating internal note:', error);
      toast.error('Failed to add internal note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const getStatusCardStyle = (status: ServiceApplicationStatus) => {
    switch (status) {
      case 'approved':
      case 'issued':
        return 'bg-green-50 border border-green-200 text-green-700';
      case 'information_requested':
        return 'bg-orange-50 border border-orange-200 text-orange-700';
      case 'denied':
      case 'expired':
      case 'withdrawn':
        return 'bg-red-50 border border-red-200 text-red-700';
      case 'under_review':
        return 'bg-blue-50 border border-blue-200 text-blue-700';
      case 'submitted':
      case 'resubmitted':
      default:
        return 'bg-muted/30 border border-muted text-foreground';
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Not set';
    return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
  };

  // Status timeline data
  const statusTimeline = [
    { status: 'draft', timestamp: application?.created_at, label: 'Application Created' },
    { status: 'submitted', timestamp: application?.submitted_at, label: 'Submitted for Review' },
    { status: 'under_review', timestamp: application?.under_review_at, label: 'Under Review' },
    { status: 'information_requested', timestamp: application?.information_requested_at, label: 'Information Requested' },
    { status: 'resubmitted', timestamp: application?.resubmitted_at, label: 'Resubmitted' },
    { status: 'approved', timestamp: application?.approved_at, label: 'Approved' },
    { status: 'denied', timestamp: application?.denied_at, label: 'Denied' },
    { status: 'withdrawn', timestamp: application?.withdrawn_at, label: 'Withdrawn' },
    { status: 'expired', timestamp: application?.expired_at, label: 'Expired' },
    { status: 'issued', timestamp: application?.paid_at, label: 'Service Issued' }
  ].filter(item => item.timestamp);

  if (!isMunicipalUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Review Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Review Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reviewer Assignment */}
          <div className="space-y-2">
            <Label>Assigned Reviewer</Label>
            {teamMembers && teamMembers.length > 0 && (
              <Select 
                onValueChange={handleAssignReviewer} 
                disabled={isUpdating}
                value={application?.assigned_reviewer_id || ""}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select reviewer" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.member_id} value={member.member_id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator />

          {/* Update Status Button */}
          <Button 
            onClick={() => setShowStatusDialog(true)}
            className="w-full"
          >
            Update Status
          </Button>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Status Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {statusTimeline.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No status changes yet</p>
            </div>
          ) : (
            statusTimeline.reverse().map((item, index) => (
              <div 
                key={index} 
                className={`flex justify-between items-center p-2 rounded ${getStatusCardStyle(item.status as ServiceApplicationStatus)}`}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs opacity-75">
                  {formatTimestamp(item.timestamp)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <ServiceApplicationStatusChangeDialog
        isOpen={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
        applicationId={application?.id}
        currentStatus={application?.status as ServiceApplicationStatus}
        onStatusChange={onStatusChange}
      />
    </div>
  );
};