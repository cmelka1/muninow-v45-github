import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useBusinessLicenseComments, useCreateBusinessLicenseComment } from '@/hooks/useBusinessLicenseComments';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { MessageCircle, Send, User } from 'lucide-react';
import { toast } from 'sonner';

interface BusinessLicenseCommunicationProps {
  licenseId: string;
}

export const BusinessLicenseCommunication = ({ licenseId }: BusinessLicenseCommunicationProps) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  
  const { data: comments, isLoading } = useBusinessLicenseComments(licenseId);
  const createComment = useCreateBusinessLicenseComment();
  
  const isMunicipalUser = user?.user_metadata?.account_type === 'municipal';

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      await createComment.mutateAsync({
        license_id: licenseId,
        comment_text: newComment.trim(),
        is_internal: false,
      });
      
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error('Failed to add comment');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
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

  const visibleComments = comments?.filter(comment => 
    !comment.is_internal || isMunicipalUser
  ) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Communication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {visibleComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No comments yet</p>
                <p className="text-sm">Start a conversation about this license application</p>
              </div>
            ) : (
              visibleComments.map((comment, index) => (
                <div key={comment.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {comment.reviewer.first_name} {comment.reviewer.last_name}
                        </span>
                        <Badge 
                          variant={comment.reviewer.account_type === 'municipal' ? 'secondary' : 'outline'} 
                          className={`text-xs ${comment.reviewer.account_type === 'municipal' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                        >
                          {comment.reviewer.account_type === 'municipal' ? 'Municipal Staff' : 'Applicant'}
                        </Badge>
                        {comment.is_internal && (
                          <Badge variant="secondary" className="text-xs">
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
                  {index < visibleComments.length - 1 && (
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
              disabled={!newComment.trim() || createComment.isPending}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {createComment.isPending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};