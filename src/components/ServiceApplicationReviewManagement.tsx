import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceApplicationStatusChangeDialog } from '@/components/ServiceApplicationStatusChangeDialog';
import { useServiceApplicationComments, useCreateServiceApplicationComment } from '@/hooks/useServiceApplicationComments';
import { useMunicipalTeamMembers } from '@/hooks/useMunicipalTeamMembers';
import { useServiceApplicationWorkflow, ServiceApplicationStatus, getStatusDisplayName, getStatusDescription } from '@/hooks/useServiceApplicationWorkflow';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ClipboardList, Users, Calendar, MessageSquare, Send, User, Clock, CheckCircle, AlertCircle, Info } from 'lucide-react';
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

  const isMunicipalUser = profile?.account_type === 'municipal';

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

  const getStatusIcon = (status: ServiceApplicationStatus) => {
    switch (status) {
      case 'submitted':
      case 'resubmitted':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'under_review':
        return <ClipboardList className="h-4 w-4 text-yellow-600" />;
      case 'information_requested':
        return <Info className="h-4 w-4 text-orange-600" />;
      case 'approved':
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'denied':
      case 'expired':
      case 'withdrawn':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
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
    { status: 'paid', timestamp: application?.paid_at, label: 'Payment Completed' }
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
            <ClipboardList className="h-5 w-5" />
            Review Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Change */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-2 block">Application Status</label>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {getStatusDisplayName(application?.status as ServiceApplicationStatus)}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusDialog(true)}
              >
                Change Status
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {getStatusDescription(application?.status as ServiceApplicationStatus)}
            </p>
          </div>

          <Separator />

          {/* Reviewer Assignment */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-2 block">Assigned Reviewer</label>
            <div className="flex items-center gap-2">
              {application?.assigned_reviewer_id ? (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {teamMembers?.find(m => m.member_id === application.assigned_reviewer_id)?.first_name}{' '}
                    {teamMembers?.find(m => m.member_id === application.assigned_reviewer_id)?.last_name}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-500">No reviewer assigned</span>
              )}
            </div>
            {teamMembers && teamMembers.length > 0 && (
              <Select onValueChange={handleAssignReviewer} disabled={isUpdating}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Assign reviewer..." />
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
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-3">
              {statusTimeline.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No status changes yet</p>
                </div>
              ) : (
                statusTimeline.reverse().map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {getStatusIcon(item.status as ServiceApplicationStatus)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{item.label}</span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Internal Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Internal Comments List */}
          <ScrollArea className="h-48">
            <div className="space-y-3">
              {internalComments.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No internal notes yet</p>
                </div>
              ) : (
                internalComments.map((comment, index) => (
                  <div key={comment.id}>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs">
                            {comment.reviewer.first_name} {comment.reviewer.last_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 whitespace-pre-wrap">
                          {comment.comment_text}
                        </p>
                      </div>
                    </div>
                    {index < internalComments.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Add Internal Note */}
          <div className="space-y-2 pt-2 border-t">
            <Textarea
              placeholder="Add internal note..."
              value={internalComment}
              onChange={(e) => setInternalComment(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAddInternalNote}
                disabled={!internalComment.trim() || isSubmittingNote}
                size="sm"
                variant="outline"
              >
                <Send className="h-3 w-3 mr-2" />
                {isSubmittingNote ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </div>
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