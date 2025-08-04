import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Clock, User, Calendar, CheckCircle, AlertCircle, Bell } from 'lucide-react';
import { usePermitComments, useCreateComment } from '@/hooks/usePermitComments';
import { usePermitRequests } from '@/hooks/usePermitRequests';
import { usePermitInspections } from '@/hooks/usePermitInspections';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PermitCommunicationProps {
  permitId: string;
  isMunicipalUser?: boolean;
}

export const PermitCommunication: React.FC<PermitCommunicationProps> = ({
  permitId,
  isMunicipalUser = false,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { profile } = useAuth();
  const { toast } = useToast();

  const { data: comments = [], isLoading: commentsLoading } = usePermitComments(permitId);
  const { data: requests = [], isLoading: requestsLoading } = usePermitRequests(permitId);
  const { data: inspections = [], isLoading: inspectionsLoading } = usePermitInspections(permitId);
  const createComment = useCreateComment();

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a comment.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createComment.mutateAsync({
        permit_id: permitId,
        comment_text: newComment,
        is_internal: false,
      });

      setNewComment('');
      
      toast({
        title: 'Success',
        description: 'Comment added successfully.',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (commentsLoading || requestsLoading || inspectionsLoading) {
    return <div>Loading communication history...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add Comment */}
      <Card>
        <CardHeader>
          <CardTitle>Comments/Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitComment} className="space-y-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment or request..."
              rows={3}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Comment'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Communication Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Communication History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Information Requests */}
          {requests.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Information Requests
              </h4>
              {requests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(request.created_at), 'PPp')}
                    </span>
                  </div>
                  <p className="font-medium">{request.request_type.replace('_', ' ').toUpperCase()}</p>
                  <p className="text-sm">{request.request_details}</p>
                  {request.due_date && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Due: {format(new Date(request.due_date), 'PPP')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Inspections */}
          {inspections.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Inspections
              </h4>
              {inspections.map((inspection) => (
                <div key={inspection.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(inspection.status)}>
                      {inspection.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {inspection.scheduled_date && format(new Date(inspection.scheduled_date), 'PPp')}
                    </span>
                  </div>
                  <p className="font-medium">{inspection.inspection_type}</p>
                  {inspection.notes && <p className="text-sm">{inspection.notes}</p>}
                  {inspection.result && (
                    <div className="flex items-center gap-1">
                      {inspection.result === 'passed' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium capitalize">{inspection.result}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Comments */}
          {comments.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Comments
              </h4>
              {comments.map((comment) => {
                const isCurrentUser = comment.reviewer_id === profile?.id;
                const commentBgClass = isMunicipalUser 
                  ? (isCurrentUser ? 'bg-gray-100' : 'bg-amber-50')
                  : (isCurrentUser ? 'bg-amber-50' : 'bg-gray-100');
                
                const displayName = isCurrentUser 
                  ? 'You' 
                  : comment.reviewer 
                    ? `${comment.reviewer.first_name} ${comment.reviewer.last_name}`
                    : 'Unknown User';
                
                return (
                  <div key={comment.id} className={`border rounded-lg p-4 space-y-2 ${commentBgClass}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {displayName} - {format(new Date(comment.created_at), 'PPP')}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm">{comment.comment_text}</p>
                  </div>
                );
              })}
            </div>
          )}

          {comments.length === 0 && requests.length === 0 && inspections.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No communication history yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};