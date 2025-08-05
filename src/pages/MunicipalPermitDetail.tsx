import React, { useState } from 'react';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Users,
  Building,
  Download,
  Eye,
  CalendarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useParallelPermitData } from '@/hooks/useParallelPermitData';
import { PermitStatusBadge } from '@/components/PermitStatusBadge';
import { PermitStatusChangeDialog } from '@/components/PermitStatusChangeDialog';
import { getStatusDisplayName, getStatusDescription, PermitStatus } from '@/hooks/usePermitWorkflow';
import { ScheduleInspectionDialog } from '@/components/ScheduleInspectionDialog';
import { PermitCommunication } from '@/components/PermitCommunication';
import { ProgressiveLoader } from '@/components/shared/ProgressiveLoader';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/hooks/use-toast';

const MunicipalPermitDetail = () => {
  const { permitId } = useParams<{ permitId: string }>();
  const navigate = useNavigate();
  const [reviewNotes, setReviewNotes] = useState('');
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  const { permit, questions, documents, isLoading, isError, error } = useParallelPermitData(permitId || '');

  const handleSaveNotes = async () => {
    if (!permitId || !reviewNotes.trim()) {
      toast({
        title: "Error",
        description: "Please enter review notes before saving",
        variant: "destructive"
      });
      return;
    }

    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from('permit_applications')
        .update({ review_notes: reviewNotes.trim() })
        .eq('permit_id', permitId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review notes saved successfully"
      });

      setReviewNotes('');
      window.location.reload();
    } catch (error) {
      console.error('Error saving review notes:', error);
      toast({
        title: "Error",
        description: "Failed to save review notes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleStatusChange = () => {
    setIsStatusDialogOpen(true);
  };

  const formatMunicipalQuestionResponse = (questionId: string, response: any) => {
    const question = questions.data?.find(q => q.id === questionId);
    if (!question) return response;
    
    if (question.question_type === 'select' && question.question_options) {
      const options = typeof question.question_options === 'object' && 
                    question.question_options !== null && 
                    'options' in question.question_options 
                    ? (question.question_options as any).options 
                    : null;
      
      if (options && Array.isArray(options)) {
        return options.find((opt: any) => opt.value === response)?.label || response;
      }
    }
    
    return response;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !permit.data) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/municipal/permits')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Permits
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">
              {error?.message || 'Error loading permit details. Please try again.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const permitData = permit.data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/municipal/permits')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Permits
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Permit Review</h1>
            <p className="text-muted-foreground">{permitData.permit_number}</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Permit Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Permit Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Permit Number</Label>
                  <p className="text-base font-mono">{permitData.permit_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <p className="text-base">{permitData.permit_type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <PermitStatusBadge status={permitData.application_status as PermitStatus} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
                  <p className="text-base">{formatDate(permitData.submitted_at)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Construction Value</Label>
                  <p className="text-base">{formatCurrency(permitData.estimated_construction_value_cents / 100)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Permit Fee</Label>
                  <p className="text-base">{formatCurrency((permitData.base_fee_cents || 0) / 100)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Property Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Property Address</Label>
                <p className="text-base">{permitData.property_address}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Scope of Work</Label>
                <p className="text-base">{permitData.scope_of_work}</p>
              </div>
            </CardContent>
          </Card>

          {/* Applicant Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Applicant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                  <p className="text-base">{permitData.applicant_full_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-base">{permitData.applicant_email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-base">{permitData.applicant_phone || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Municipal Questions - with Progressive Loading */}
          <ProgressiveLoader
            title="Municipal Questions"
            icon={<Building className="h-5 w-5" />}
            isLoading={questions.isLoading}
            error={questions.error}
          >
            {questions.data && questions.data.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Municipal Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {questions.data.map((question) => {
                    const response = permitData.municipal_questions_responses?.[question.id];
                    const hasResponse = response !== undefined && response !== null;
                    const isYes = hasResponse && (response === true || response === 'yes');
                    
                    return (
                      <div key={question.id} className="flex items-center justify-between py-2">
                        <span className="text-sm">{question.question_text}</span>
                        <Badge variant={isYes ? "default" : "outline"}>
                          {isYes ? "Yes" : "No"}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : null}
          </ProgressiveLoader>

          {/* Documents Section - with Progressive Loading */}
          <ProgressiveLoader
            title="Documents"
            icon={<FileText className="h-5 w-5" />}
            isLoading={documents.isLoading}
            error={documents.error}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents ({documents.data?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.data && documents.data.length > 0 ? (
                  <div className="space-y-3">
                    {documents.data.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{doc.file_name}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                              <span>Uploaded: {formatDate(doc.uploaded_at)}</span>
                            </div>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async () => {
                              try {
                                const { data, error } = await supabase.storage
                                  .from('permit-documents')
                                  .createSignedUrl(doc.storage_path, 3600);
                                
                                if (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to preview document",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                if (data?.signedUrl) {
                                  window.open(data.signedUrl, '_blank');
                                }
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to preview document",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async () => {
                              try {
                                const { data, error } = await supabase.storage
                                  .from('permit-documents')
                                  .download(doc.storage_path);
                                
                                if (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to download document",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                if (data) {
                                  const url = URL.createObjectURL(data);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = doc.file_name;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                }
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to download document",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No documents uploaded yet</p>
                    <p className="text-xs mt-1">Documents will appear here once uploaded by the applicant</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </ProgressiveLoader>
        </div>

        {/* Right Column - Actions & Review */}
        <div className="space-y-6">
          {/* Review Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Review Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="assignee">Assigned Reviewer</Label>
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reviewer1">John Smith</SelectItem>
                    <SelectItem value="reviewer2">Jane Doe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Button 
                  onClick={handleStatusChange}
                  className="w-full"
                  variant="default"
                >
                  Update Status
                </Button>
                <Button 
                  onClick={() => setIsInspectionDialogOpen(true)}
                  className="w-full"
                  variant="outline"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Schedule Inspection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Review Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Review Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {permitData.review_notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">Previous Notes:</Label>
                  <p className="text-sm mt-1">{permitData.review_notes}</p>
                </div>
              )}
              
              <div>
                <Label htmlFor="reviewNotes">Add Review Notes</Label>
                <Textarea
                  id="reviewNotes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter your review notes..."
                  className="mt-1"
                  rows={4}
                />
              </div>
              
              <Button 
                onClick={handleSaveNotes}
                disabled={isSavingNotes || !reviewNotes.trim()}
                className="w-full"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </Button>
            </CardContent>
          </Card>

          {/* Communication */}
          <PermitCommunication permitId={permitId!} />
        </div>
      </div>

      {/* Dialogs */}
      <PermitStatusChangeDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        permitId={permitId!}
        currentStatus={permitData.application_status as PermitStatus}
      />
      
      <ScheduleInspectionDialog
        open={isInspectionDialogOpen}
        onOpenChange={setIsInspectionDialogOpen}
        permitId={permitId!}
      />
    </div>
  );
};

export default MunicipalPermitDetail;