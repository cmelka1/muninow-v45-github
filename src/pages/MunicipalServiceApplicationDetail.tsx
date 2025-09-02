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
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServiceApplication } from '@/hooks/useServiceApplication';
import ServiceApplicationStatusBadge from '@/components/ServiceApplicationStatusBadge';
import { ServiceApplicationStatusChangeDialog } from '@/components/ServiceApplicationStatusChangeDialog';
import { ServiceApplicationCommunication } from '@/components/ServiceApplicationCommunication';
import { ServiceApplicationStatus, getStatusDisplayName } from '@/hooks/useServiceApplicationWorkflow';
import { useServiceApplicationDocuments } from '@/hooks/useServiceApplicationDocuments';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/hooks/use-toast';

const MunicipalServiceApplicationDetail = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [reviewNotes, setReviewNotes] = useState('');
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  const { data: application, isLoading, error } = useServiceApplication(applicationId!);
  const { data: documents } = useServiceApplicationDocuments(applicationId!);

  const handleSaveNotes = async () => {
    if (!applicationId || !reviewNotes.trim()) {
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
        .from('municipal_service_applications')
        .update({ review_notes: reviewNotes.trim() })
        .eq('id', applicationId);

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

  const renderFormField = (field: any, value: any) => {
    if (!value) return 'N/A';
    
    switch (field.type) {
      case 'select':
        const option = field.options?.find((opt: any) => opt.value === value);
        return option?.label || value;
      case 'checkbox':
        return value ? 'Yes' : 'No';
      case 'date':
        return format(new Date(value), 'MMM d, yyyy');
      default:
        return value;
    }
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

  if (error || !application) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/municipal/other-services')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading application details. Please try again.</p>
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
          <Button variant="outline" onClick={() => navigate('/municipal/other-services')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Service Application Review</h1>
            <p className="text-muted-foreground">{application.id.slice(0, 8)}...</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Application Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Application ID</Label>
                  <p className="text-base font-mono">{application.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Service</Label>
                  <p className="text-base">{application.tile.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <ServiceApplicationStatusBadge status={application.status} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
                  <p className="text-base">{formatDate(application.created_at)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Municipality</Label>
                  <p className="text-base">{application.customer.legal_entity_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                  <p className="text-base">{formatCurrency(application.tile.amount_cents / 100)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Service Title</Label>
                <p className="text-base font-medium">{application.tile.title}</p>
              </div>
              {application.tile.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-base">{application.tile.description}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Requires Review</Label>
                <p className="text-base">{application.tile.requires_review ? 'Yes' : 'No'}</p>
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
                  <p className="text-base">
                    {application.applicant_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-base">{application.applicant_email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-base">{application.applicant_phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  <p className="text-base">
                    {[
                      application.street_address,
                      application.apt_number && `Apt ${application.apt_number}`,
                      application.city,
                      application.state,
                      application.zip_code,
                    ].filter(Boolean).join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Fields */}
          {application.tile.form_fields && application.tile.form_fields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Application Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {application.tile.form_fields.map((field: any) => {
                  const value = application.service_specific_data?.[field.id] || application.service_specific_data?.[field.name];
                  if (!value && !field.required) return null;
                  
                  return (
                    <div key={field.name} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        {field.label}
                      </Label>
                      <div className="md:col-span-2">
                        <p className="text-sm">{renderFormField(field, value)}</p>
                      </div>
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
                Documents ({documents?.length || 0})
              </CardTitle>
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
                          onClick={() => {
                            setSelectedDocument(doc);
                            setDocumentViewerOpen(true);
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
                                .from('service-application-documents')
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
              </div>
            </CardContent>
          </Card>

          {/* Review Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Review Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.review_notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">Previous Notes</Label>
                  <p className="text-sm mt-1">{application.review_notes}</p>
                </div>
              )}
              
              <div>
                <Label htmlFor="review-notes">Add Review Notes</Label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this application review..."
                  className="mt-1"
                  rows={4}
                />
              </div>
              
              <Button 
                onClick={handleSaveNotes} 
                disabled={!reviewNotes.trim() || isSavingNotes}
                className="w-full"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </Button>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          {application.tile.amount_cents > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Service Fee</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(application.tile.amount_cents / 100)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Payment Status</span>
                  <Badge variant={application.payment_status === 'paid' ? 'default' : 'outline'}>
                    {application.payment_status || 'Unpaid'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Communication */}
          <ServiceApplicationCommunication applicationId={applicationId!} />
        </div>
      </div>

      {/* Status Change Dialog */}
      <ServiceApplicationStatusChangeDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        applicationId={applicationId!}
        currentStatus={application.status as ServiceApplicationStatus}
        onStatusChange={() => window.location.reload()}
      />

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewerModal
          isOpen={documentViewerOpen}
          onClose={() => {
            setDocumentViewerOpen(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
          bucketName="service-application-documents"
        />
      )}
    </div>
  );
};

export default MunicipalServiceApplicationDetail;