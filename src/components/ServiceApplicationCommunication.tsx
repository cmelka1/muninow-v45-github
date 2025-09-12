import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, User } from 'lucide-react';
import { useServiceApplicationComments, useCreateServiceApplicationComment } from '@/hooks/useServiceApplicationComments';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ServiceApplicationCommunicationProps {
  applicationId: string;
}

export const ServiceApplicationCommunication: React.FC<ServiceApplicationCommunicationProps> = ({
  applicationId
}) => {
  const [newComment, setNewComment] = useState('');
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: comments, isLoading } = useServiceApplicationComments(applicationId);
  const { mutate: createComment, isPending } = useCreateServiceApplicationComment();

  const isMunicipalUser = ['municipaladmin', 'municipaluser'].includes(profile?.account_type);

  const handleSubmit = async () => {
    if (!newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setIsSubmitting(true);

    try {
      await createComment({
        application_id: applicationId,
        comment_text: newComment,
        is_internal: false // Always external for simplified communication
      });

      setNewComment('');
      toast.success("Comment added successfully");
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error(error.message || "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter comments based on user role - only show external comments in communication
  const filteredComments = comments?.filter(comment => !comment.is_internal) || [];

  if (isLoading) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Communication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment List */}
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {filteredComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No communication yet</p>
                <p className="text-sm">Comments and updates will appear here</p>
              </div>
            ) : (
              filteredComments.map((comment, index) => (
                <div key={comment.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {comment.reviewer?.first_name} {comment.reviewer?.last_name}
                        </span>
                        <Badge 
                          variant={['municipaladmin', 'municipaluser'].includes(comment.reviewer?.account_type) ? 'secondary' : 'outline'} 
                          className={`text-xs ${['municipaladmin', 'municipaluser'].includes(comment.reviewer?.account_type) ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                        >
                          {['municipaladmin', 'municipaluser'].includes(comment.reviewer?.account_type) ? 'Municipal Staff' : 'Applicant'}
                        </Badge>
                        {comment.is_internal && (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                            Internal
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {comment.comment_text}
                      </p>
                    </div>
                  </div>
                  {index < filteredComments.length - 1 && (
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
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[80px]"
          />
          <div className="flex items-center justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !newComment.trim()}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};