import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { useTaxSubmissionComments, useCreateTaxSubmissionComment } from '@/hooks/useTaxSubmissionComments';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface TaxSubmissionCommunicationProps {
  submissionId: string;
}

export const TaxSubmissionCommunication: React.FC<TaxSubmissionCommunicationProps> = ({ 
  submissionId 
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: comments, isLoading } = useTaxSubmissionComments(submissionId);
  const createComment = useCreateTaxSubmissionComment();
  const { profile } = useAuth();
  const { toast } = useToast();

  const isMunicipalUser = ['municipaladmin', 'municipaluser'].includes(profile?.account_type || '');

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment.mutateAsync({
        submission_id: submissionId,
        comment_text: newComment.trim(),
        is_internal: false,
      });
      
      setNewComment('');
      toast({
        title: 'Comment added',
        description: 'Your comment has been sent successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send comment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>Communication</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Filter out internal comments for non-municipal users
  const visibleComments = comments?.filter(comment => 
    isMunicipalUser || !comment.is_internal
  ) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <CardTitle>Communication</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        <ScrollArea className="h-48 w-full">
          <div className="space-y-3">
            {visibleComments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No comments yet. Start a conversation with the municipality.</p>
            ) : (
              visibleComments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-muted pl-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.reviewer.first_name} {comment.reviewer.last_name}
                    </span>
                    <Badge 
                      variant={['municipaladmin', 'municipaluser'].includes(comment.reviewer.account_type) ? 'secondary' : 'outline'} 
                      className={`text-xs ${['municipaladmin', 'municipaluser'].includes(comment.reviewer.account_type) ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {['municipaladmin', 'municipaluser'].includes(comment.reviewer.account_type) ? 'Municipal Staff' : 'Applicant'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {comment.comment_text}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* New Comment Input */}
        <div className="space-y-3">
          <Textarea
            placeholder="Type your message to the municipality..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};