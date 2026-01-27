import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Clock, Calendar, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { usePermitComments, useCreateComment } from '@/hooks/usePermitComments';
import { usePermitRequests } from '@/hooks/usePermitRequests';
import { usePermitInspections } from '@/hooks/usePermitInspections';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PermitCommunicationProps {
  permitId: string;
  isMunicipalUser?: boolean;
}

type CommunicationItem = {
  type: 'request' | 'inspection' | 'comment';
  id: string;
  date: Date;
  data: any;
};

export const PermitCommunication: React.FC<PermitCommunicationProps> = ({
  permitId,
  isMunicipalUser = false,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { profile } = useAuth();

  const { data: comments = [], isLoading: commentsLoading } = usePermitComments(permitId);
  const { data: requests = [], isLoading: requestsLoading } = usePermitRequests(permitId);
  const { data: inspections = [], isLoading: inspectionsLoading } = usePermitInspections(permitId);
  const createComment = useCreateComment();

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);

    try {
      await createComment.mutateAsync({
        permit_id: permitId,
        comment_text: newComment,
        is_internal: false,
      });

      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (commentsLoading || requestsLoading || inspectionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Combine all communication items with proper typing
  const allCommunication: CommunicationItem[] = [
    ...requests.map(request => ({
      type: 'request' as const,
      id: `request-${request.id}`,
      date: new Date(request.created_at),
      data: request
    })),
    ...inspections.map(inspection => ({
      type: 'inspection' as const,
      id: `inspection-${inspection.id}`,
      date: new Date(inspection.scheduled_date || inspection.created_at),
      data: inspection
    })),
    ...comments.map(comment => ({
      type: 'comment' as const,
      id: `comment-${comment.id}`,
      date: new Date(comment.created_at),
      data: comment
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Communication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Communication History */}
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {allCommunication.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No communication yet</p>
                <p className="text-sm">Comments and updates will appear here</p>
              </div>
            ) : (
              allCommunication.map((item, index) => (
                <div key={item.id}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {item.type === 'request' && (
                        <>
                          <span className="font-medium text-sm">Information Request</span>
                          <Badge variant="outline" className={getStatusColor(item.data.status)}>
                            {item.data.status}
                          </Badge>
                        </>
                      )}
                      {item.type === 'inspection' && (
                        <>
                          <span className="font-medium text-sm">{item.data.inspection_type}</span>
                          <Badge variant="outline" className={getStatusColor(item.data.status)}>
                            {item.data.status}
                          </Badge>
                        </>
                      )}
                      {item.type === 'comment' && (
                        <>
                          <span className="font-medium text-sm">
                            {item.data.reviewer?.first_name} {item.data.reviewer?.last_name}
                          </span>
                          <Badge 
                            variant={['municipaladmin', 'municipaluser'].includes(item.data.reviewer?.account_type) ? 'secondary' : 'outline'} 
                            className={`text-xs ${['municipaladmin', 'municipaluser'].includes(item.data.reviewer?.account_type) ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                          >
                            {['municipaladmin', 'municipaluser'].includes(item.data.reviewer?.account_type) ? 'Municipal Staff' : 'Applicant'}
                          </Badge>
                        </>
                      )}
                      <span className="text-xs text-gray-500">
                        {format(item.date, 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    
                    {item.type === 'request' && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{item.data.request_type?.replace('_', ' ').toUpperCase()}</p>
                        <p className="text-sm text-gray-700">{item.data.request_details}</p>
                        {item.data.due_date && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            Due: {format(new Date(item.data.due_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {item.type === 'inspection' && (
                      <div className="space-y-1">
                        {item.data.notes && <p className="text-sm text-gray-700">{item.data.notes}</p>}
                        {item.data.result && (
                          <div className="flex items-center gap-1 text-sm">
                            {item.data.result === 'passed' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium capitalize">{item.data.result}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {item.type === 'comment' && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {item.data.comment_text}
                      </p>
                    )}
                  </div>
                  {index < allCommunication.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Add Comment Form */}
        <div className="space-y-3 pt-4 border-t">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />
          
          <div className="flex items-center justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};