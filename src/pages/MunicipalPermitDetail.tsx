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
  Eye
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
import { formatCurrency, formatDate } from '@/lib/formatters';

const MunicipalPermitDetail = () => {
  const { permitId } = useParams<{ permitId: string }>();
  const navigate = useNavigate();
  const [reviewNotes, setReviewNotes] = useState('');
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  
  const { data: permit, isLoading, error } = usePermit(permitId!);
  const { data: questions } = useMunicipalPermitQuestions(
    permit?.customer_id,
    permit?.merchant_id
  );

  const handleSaveNotes = () => {
    // TODO: Implement saving review notes
    console.log('Saving notes:', reviewNotes);
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
          <Button variant="outline" onClick={() => navigate('/municipal/permits')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Permits
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/municipal/permits')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Permits
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Permit Review</h1>
            <p className="text-muted-foreground">{permit.permit_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleStatusChange}>
            Update Status
          </Button>
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
                  <p className="text-base">{permit.permit_type}</p>
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
                  <p className="text-base">{formatCurrency(permit.estimated_construction_value_cents / 100)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Permit Fee</Label>
                  <p className="text-base">{formatCurrency(permit.total_amount_cents / 100)}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status Description</Label>
                <p className="text-base text-muted-foreground">
                  {getStatusDescription(permit.application_status as PermitStatus)}
                </p>
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
                <Label className="text-sm font-medium text-muted-foreground">Project Description</Label>
                <p className="text-base">{permit.project_description}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Scope of Work</Label>
                <p className="text-base">{permit.scope_of_work}</p>
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

          {/* Municipal Questions Responses */}
          {permit.municipal_questions_responses && Object.keys(permit.municipal_questions_responses).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Municipal Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(permit.municipal_questions_responses).map(([questionId, response]) => {
                  const question = questions?.find(q => q.id === questionId);
                  return (
                    <div key={questionId} className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        {question?.question_text || questionId}
                      </Label>
                      <p className="text-base">
                        {formatMunicipalQuestionResponse(questionId, response)}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                <p>Document management functionality will be available soon.</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Site Plan.pdf</span>
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Building Plans.pdf</span>
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
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
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={handleStatusChange}
                >
                  Update Status
                </Button>
                <Button variant="outline" className="w-full">
                  Request Information
                </Button>
                <Button variant="outline" className="w-full">
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
              <div>
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add your review notes here..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-1 min-h-[100px]"
                />
              </div>
              <Button onClick={handleSaveNotes} className="w-full">
                Save Notes
              </Button>
              
              {permit.review_notes && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium">Previous Notes</Label>
                  <p className="text-sm mt-1">{permit.review_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Review Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {permit.submitted_at && (
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-sm font-medium">Submitted</span>
                  <span className="text-xs text-muted-foreground">{formatDate(permit.submitted_at)}</span>
                </div>
              )}
              {permit.under_review_at && (
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-sm font-medium">Under Review</span>
                  <span className="text-xs text-muted-foreground">{formatDate(permit.under_review_at)}</span>
                </div>
              )}
              {permit.information_requested_at && (
                <div className="flex justify-between items-center p-2 bg-orange-50 border border-orange-200 rounded">
                  <span className="text-sm font-medium text-orange-700">Info Requested</span>
                  <span className="text-xs text-orange-600">{formatDate(permit.information_requested_at)}</span>
                </div>
              )}
              {permit.approved_at && (
                <div className="flex justify-between items-center p-2 bg-green-50 border border-green-200 rounded">
                  <span className="text-sm font-medium text-green-700">Approved</span>
                  <span className="text-xs text-green-600">{formatDate(permit.approved_at)}</span>
                </div>
              )}
              {permit.denied_at && (
                <div className="flex justify-between items-center p-2 bg-red-50 border border-red-200 rounded">
                  <span className="text-sm font-medium text-red-700">Denied</span>
                  <span className="text-xs text-red-600">{formatDate(permit.denied_at)}</span>
                </div>
              )}
              {permit.issued_at && (
                <div className="flex justify-between items-center p-2 bg-emerald-50 border border-emerald-200 rounded">
                  <span className="text-sm font-medium text-emerald-700">Issued</span>
                  <span className="text-xs text-emerald-600">{formatDate(permit.issued_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Change Dialog */}
      <PermitStatusChangeDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        permitId={permit.permit_id}
        currentStatus={permit.application_status as PermitStatus}
        onStatusChanged={() => {
          // Refresh permit data
          window.location.reload();
        }}
      />
    </div>
  );
};

export default MunicipalPermitDetail;