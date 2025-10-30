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
  CalendarIcon,
  Edit,
  Calendar,
  CreditCard,
  Plus,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermit } from '@/hooks/usePermit';
import { PermitStatusBadge } from '@/components/PermitStatusBadge';
import { PermitStatusChangeDialog } from '@/components/PermitStatusChangeDialog';
import { getStatusDisplayName, getStatusDescription, PermitStatus } from '@/hooks/usePermitWorkflow';
import { useMunicipalPermitQuestions } from '@/hooks/useMunicipalPermitQuestions';
import { usePermitDocuments } from '@/hooks/usePermitDocuments';
import { ScheduleInspectionDialog } from '@/components/ScheduleInspectionDialog';
import { PermitCommunication } from '@/components/PermitCommunication';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { AddPermitDocumentDialog } from '@/components/AddPermitDocumentDialog';


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
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [downloadingDocument, setDownloadingDocument] = useState<string | null>(null);
  
  const { data: permit, isLoading, error, refetch } = usePermit(permitId!);
  const { data: questions } = useMunicipalPermitQuestions(
    permit?.customer_id,
    permit?.merchant_id
  );
  const { data: documents, refetch: refetchDocuments } = usePermitDocuments(permitId!);

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

      // Clear the textarea after successful save
      setReviewNotes('');
      
      // Refresh the permit data to show updated notes
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
    const question = questions?.find(q => q.id === questionId);
    if (!question) return response;
    
    if (question.question_type === 'select' && question.question_options?.options) {
      return question.question_options.options.find((opt: any) => opt.value === response)?.label || response;
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

  if (error || !permit) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/municipal/permits')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading permit details. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/municipal/permits')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Permit Review</h1>
            <p className="text-muted-foreground">{permit.permit_number}</p>
          </div>
          <div className="flex items-center gap-3">
            <PermitStatusBadge status={permit.application_status as PermitStatus} />
            <Button 
              className="flex items-center gap-2"
              size="sm"
              onClick={handleStatusChange}
            >
              <Edit className="h-4 w-4" />
              Update Status
            </Button>
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
                  <p className="text-base font-mono">{permit.permit_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <p className="text-base mt-1">{permit.permit_type_name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <PermitStatusBadge status={permit.application_status as PermitStatus} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
                  <p className="text-base">{formatDate(permit.submitted_at)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Construction Value</Label>
                  <p className="text-base">{formatCurrency(permit.estimated_construction_value_cents)}</p>
                </div>
                 <div>
                   <Label className="text-sm font-medium text-muted-foreground">Permit Fee</Label>
                   <p className="text-base">{formatCurrency(permit.payment_amount_cents || 0)}</p>
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
                <p className="text-base">{permit.property_address}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Scope of Work</Label>
                <SafeHtmlRenderer 
                  content={permit.scope_of_work} 
                  className="mt-1"
                  fallback="No scope of work provided"
                />
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
                  <p className="text-base">{permit.applicant_full_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-base">{permit.applicant_email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-base">{permit.applicant_phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  <p className="text-base">{permit.applicant_address || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Municipal Questions */}
          {questions && questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Municipal Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {questions.map((question) => {
                  const response = permit.municipal_questions_responses?.[question.id];
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
          )}

          {/* Documents Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents ({documents?.length || 0})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddDocumentOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
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
                            setDownloadingDocument(doc.id);
                            try {
                              const { data, error } = await supabase.storage
                                .from('permit-documents')
                                .download(doc.storage_path);
                              
                              if (error) {
                                console.error('Error downloading document:', error);
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
                                toast({
                                  title: "Success",
                                  description: "Document downloaded successfully"
                                });
                              }
                            } catch (error) {
                              console.error('Error downloading document:', error);
                              toast({
                                title: "Error",
                                description: "Failed to download document",
                                variant: "destructive"
                              });
                            } finally {
                              setDownloadingDocument(null);
                            }
                          }}
                          disabled={downloadingDocument === doc.id}
                        >
                          {downloadingDocument === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No documents uploaded yet</p>
                  <p className="text-xs mt-1">Documents will appear here once uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>
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
                    <SelectItem value="john-doe">John Doe</SelectItem>
                    <SelectItem value="jane-smith">Jane Smith</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Assign a team member to review this permit application
                </p>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsInspectionDialogOpen(true)}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Schedule Inspection
              </Button>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Payment Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* Status Badge */}
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <Badge 
                    variant={permit.payment_status === 'paid' ? 'default' : 'outline'}
                    className={
                      permit.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' 
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200'
                    }
                  >
                    {permit.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>
                
                {/* Paid On - Only show if paid */}
                {permit.payment_processed_at && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Paid On</span>
                    <span className="font-semibold">
                      {format(new Date(permit.payment_processed_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                
                <Separator />
                
                {/* Base Amount - Always show */}
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Base Amount</span>
                  <span className="font-semibold">{formatCurrency(permit.payment_amount_cents || 0)}</span>
                </div>
                
                {/* Service Fee and Total - Only show for paid transactions */}
                {permit.payment_status === 'paid' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Service Fee</span>
                      <span className="font-semibold">{formatCurrency(permit.service_fee_cents || 0)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Paid</span>
                      <span>{formatCurrency(permit.total_amount_cents || 0)}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {permit.created_at && (
                  <div className="flex justify-between text-sm">
                    <span>Created</span>
                    <span className="text-gray-600">{formatDate(permit.created_at)}</span>
                  </div>
                )}
                {permit.submitted_at && (
                  <div className="flex justify-between text-sm">
                    <span>Submitted</span>
                    <span className="text-gray-600">{formatDate(permit.submitted_at)}</span>
                  </div>
                )}
                {permit.under_review_at && (
                  <div className="flex justify-between text-sm">
                    <span>Under Review</span>
                    <span className="text-gray-600">{formatDate(permit.under_review_at)}</span>
                  </div>
                )}
                {permit.information_requested_at && (
                  <div className="flex justify-between text-sm">
                    <span>Info Requested</span>
                    <span className="text-gray-600">{formatDate(permit.information_requested_at)}</span>
                  </div>
                )}
                {permit.approved_at && (
                  <div className="flex justify-between text-sm">
                    <span>Approved</span>
                    <span className="text-gray-600">{formatDate(permit.approved_at)}</span>
                  </div>
                )}
                {permit.denied_at && (
                  <div className="flex justify-between text-sm">
                    <span>Denied</span>
                    <span className="text-gray-600">{formatDate(permit.denied_at)}</span>
                  </div>
                )}
                {permit.issued_at && (
                  <div className="flex justify-between text-sm">
                    <span>Issued</span>
                    <span className="text-gray-600">{formatDate(permit.issued_at)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <PermitCommunication permitId={permitId!} isMunicipalUser={true} />

        </div>
      </div>

      {/* Dialogs */}
      <ScheduleInspectionDialog
        open={isInspectionDialogOpen}
        onOpenChange={setIsInspectionDialogOpen}
        permitId={permitId!}
      />


      {/* Status Change Dialog */}
      <PermitStatusChangeDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        permitId={permit.permit_id}
        currentStatus={permit.application_status as PermitStatus}
        onStatusChanged={() => {
          refetch();
          setIsStatusDialogOpen(false);
        }}
      />

      {/* Add Document Dialog */}
      <AddPermitDocumentDialog
        open={addDocumentOpen}
        onOpenChange={setAddDocumentOpen}
        permitId={permitId!}
        customerId={permit.customer_id}
        merchantId={permit.merchant_id}
        merchantName={permit.merchant_name}
        onSuccess={() => {
          refetchDocuments();
          toast({
            title: "Document uploaded",
            description: "Document has been successfully added to the permit"
          });
        }}
      />

    </div>
  );
};

export default MunicipalPermitDetail;