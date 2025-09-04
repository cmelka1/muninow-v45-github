import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { useMunicipalPermitQuestions } from '@/hooks/useMunicipalPermitQuestions';
import {
  useCreateMunicipalPermitQuestion,
  useUpdateMunicipalPermitQuestion,
  useDeleteMunicipalPermitQuestion,
} from '@/hooks/useMunicipalPermitQuestionsMutations';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase } from '@/integrations/supabase/client';

const NewQuestionRow: React.FC<{
  onAdd: (question: any) => void;
  nextDisplayOrder: number;
}> = ({ onAdd, nextDisplayOrder }) => {
  const [questionText, setQuestionText] = useState('');

  const handleAdd = () => {
    if (!questionText.trim()) return;

    onAdd({
      question_text: questionText,
      question_type: 'checkbox', // Hardcoded to checkbox for yes/no questions
      is_required: false, // Not needed for yes/no questions
      merchant_id: null, // Applies to all merchants
      help_text: null,
      display_order: nextDisplayOrder,
      is_active: true, // Auto-active when added
    });

    // Reset form
    setQuestionText('');
  };

  return (
    <TableRow className="bg-muted/50">
      <TableCell>
        <Input
          placeholder="Enter yes/no question..."
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          className="w-full"
        />
      </TableCell>
      <TableCell className="text-center">
        <Switch checked={true} disabled />
      </TableCell>
      <TableCell>
        <Button 
          onClick={handleAdd} 
          size="sm" 
          disabled={!questionText.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export const PermitQuestionsCard: React.FC = () => {
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [changes, setChanges] = useState<Record<string, any>>({});

  // Get customer ID from user profile
  const [customerId, setCustomerId] = useState<string | undefined>();

  React.useEffect(() => {
    const fetchCustomerId = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('customer_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.customer_id) {
        setCustomerId(profile.customer_id);
      }
    };

    fetchCustomerId();
  }, [user]);

  const { data: questions = [], isLoading } = useMunicipalPermitQuestions(customerId);
  
  const createMutation = useCreateMunicipalPermitQuestion();
  const updateMutation = useUpdateMunicipalPermitQuestion();
  const deleteMutation = useDeleteMunicipalPermitQuestion();

  const handleFieldChange = (questionId: string, field: string, value: any) => {
    setChanges(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      }
    }));
  };

  const getFieldValue = (question: any, field: string) => {
    return changes[question.id]?.[field] !== undefined 
      ? changes[question.id][field] 
      : question[field];
  };

  const handleSave = async () => {
    try {
      const updatePromises = Object.entries(changes).map(([questionId, questionChanges]) => 
        updateMutation.mutateAsync({ id: questionId, ...questionChanges })
      );

      await Promise.all(updatePromises);
      setChanges({});
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  const handleCancel = () => {
    setChanges({});
    setIsEditMode(false);
  };

  const handleAddQuestion = async (questionData: any) => {
    try {
      await createMutation.mutateAsync(questionData);
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await deleteMutation.mutateAsync(questionId);
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const nextDisplayOrder = Math.max(0, ...questions.map(q => q.display_order)) + 1;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permit Questions</CardTitle>
          <CardDescription>Loading questions...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Permit Questions</CardTitle>
            <CardDescription>
              Configure yes/no questions that will be asked on permit applications
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={Object.keys(changes).length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditMode(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Questions
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.id}>
                <TableCell>
                  {isEditMode ? (
                    <Textarea
                      value={getFieldValue(question, 'question_text')}
                      onChange={(e) => handleFieldChange(question.id, 'question_text', e.target.value)}
                      className="w-full min-h-[60px]"
                    />
                  ) : (
                    <span className="text-sm">{question.question_text}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {isEditMode ? (
                    <Switch
                      checked={getFieldValue(question, 'is_active')}
                      onCheckedChange={(value) => handleFieldChange(question.id, 'is_active', value)}
                    />
                  ) : (
                    <Switch checked={question.is_active} disabled />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {isEditMode && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Question</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this question? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteQuestion(question.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {isEditMode && (
              <NewQuestionRow
                onAdd={handleAddQuestion}
                nextDisplayOrder={nextDisplayOrder}
              />
            )}
          </TableBody>
        </Table>
        
        {questions.length === 0 && !isEditMode && (
          <div className="text-center py-8 text-muted-foreground">
            No permit questions configured. Click "Edit Questions" to add some.
          </div>
        )}
      </CardContent>
    </Card>
  );
};