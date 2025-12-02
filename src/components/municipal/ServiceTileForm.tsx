import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Upload, FileText, DollarSign, Trash2 } from 'lucide-react';
import { MunicipalServiceTile, useCreateServiceTile, useUpdateServiceTile, useDeleteServiceTile } from '@/hooks/useMunicipalServiceTiles';
import { useMerchants } from '@/hooks/useMerchants';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ServiceTileFormProps {
  tile?: MunicipalServiceTile | null;
  customerId?: string;
  onClose: () => void;
}

// Standard form fields for all "Other Services"
const STANDARD_FORM_FIELDS = [
  {
    id: 'name',
    label: 'Full Name',
    type: 'text' as const,
    required: true,
    placeholder: 'Enter your full name'
  },
  {
    id: 'business_legal_name',
    label: 'Business Legal Name',
    type: 'text' as const,
    required: false,
    placeholder: 'Enter business legal name (if applicable)'
  },
  {
    id: 'phone',
    label: 'Phone Number',
    type: 'phone' as const,
    required: true,
    placeholder: 'Enter your phone number'
  },
  {
    id: 'email',
    label: 'Email Address',
    type: 'email' as const,
    required: true,
    placeholder: 'Enter your email address'
  },
  {
    id: 'address',
    label: 'Address',
    type: 'text' as const,
    required: true,
    placeholder: 'Enter your full address'
  },
  {
    id: 'additional_information',
    label: 'Additional Information',
    type: 'textarea' as const,
    required: false,
    placeholder: 'Please provide any additional details or information relevant to your request...'
  }
];

export function ServiceTileForm({ tile, customerId, onClose }: ServiceTileFormProps) {
  const { profile } = useAuth();
  const { merchants, isLoading, fetchMerchantsByCustomer } = useMerchants();
  const createServiceTile = useCreateServiceTile();
  const updateServiceTile = useUpdateServiceTile();
  const deleteServiceTile = useDeleteServiceTile();
  
  // Form state
  const [title, setTitle] = useState(tile?.title || '');
  const [description, setDescription] = useState(tile?.description || '');
  const [amountDollars, setAmountDollars] = useState(tile ? (tile.amount_cents / 100).toString() : '0');
  const [requiresReview, setRequiresReview] = useState(tile?.requires_review || false);
  const [isActive, setIsActive] = useState(tile?.is_active !== false);
  const [allowUserDefinedAmount, setAllowUserDefinedAmount] = useState(tile?.allow_user_defined_amount || false);
  const [selectedMerchantId, setSelectedMerchantId] = useState(tile?.merchant_id || '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRenewable, setIsRenewable] = useState(tile?.is_renewable || false);
  const [renewalFrequency, setRenewalFrequency] = useState<'annual' | 'quarterly'>(tile?.renewal_frequency || 'annual');
  const [renewalReminderDays, setRenewalReminderDays] = useState(tile?.renewal_reminder_days || 30);
  const [autoRenewEnabled, setAutoRenewEnabled] = useState(tile?.auto_renew_enabled || false);
  const [requiresPayment, setRequiresPayment] = useState(tile?.requires_payment !== false); // Default true
  const [guidanceText, setGuidanceText] = useState(tile?.guidance_text || '');
  const [requiresDocumentUpload, setRequiresDocumentUpload] = useState(tile?.requires_document_upload || false);
  

  // Fetch merchants for this municipality on mount
  useEffect(() => {
    const customerIdToUse = customerId || profile?.customer_id;
    
    if (customerIdToUse) {
      fetchMerchantsByCustomer(customerIdToUse);
    }
  }, [customerId, profile?.customer_id]);

  const selectedMerchant = merchants?.find(m => m.id === selectedMerchantId);

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Error',
          description: 'Only PDF files are allowed',
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Error', 
          description: 'File size must be less than 10MB',
          variant: 'destructive',
        });
        return;
      }
      setPdfFile(file);
    }
  };

  const uploadPdfFile = async (file: File, customerId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${customerId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('municipal-service-forms')
      .upload(fileName, file);

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('municipal-service-forms')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Service title is required',
        variant: 'destructive',
      });
      return;
    }

    const amountCents = Math.round(parseFloat(amountDollars || '0') * 100);
    
    let finalPdfUrl = tile?.pdf_form_url; // Keep existing URL if no new file uploaded
    
    // Upload new PDF file if selected
    if (pdfFile) {
      try {
        setIsUploadingPdf(true);
        const customerIdToUse = customerId || profile?.customer_id!;
        finalPdfUrl = await uploadPdfFile(pdfFile, customerIdToUse);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to upload PDF file',
          variant: 'destructive',
        });
        setIsUploadingPdf(false);
        return;
      } finally {
        setIsUploadingPdf(false);
      }
    }
    
    const serviceData = {
      title: title.trim(),
      description: description.trim() || undefined,
      guidance_text: guidanceText.trim() || undefined,
      amount_cents: requiresPayment ? amountCents : 0, // Force 0 if no payment
      requires_review: requiresReview,
      requires_payment: requiresPayment,
      requires_document_upload: requiresDocumentUpload,
      is_active: isActive,
      auto_populate_user_info: false,
      allow_user_defined_amount: requiresPayment && allowUserDefinedAmount, // Only if payment required
      merchant_id: requiresPayment ? (selectedMerchantId || undefined) : undefined, // Only if payment required
      finix_merchant_id: requiresPayment ? (selectedMerchant?.finix_merchant_id || undefined) : undefined, // Only if payment required
      // merchant_fee_profile_id will be set via merchant relationship
      pdf_form_url: finalPdfUrl,
      form_fields: STANDARD_FORM_FIELDS,
      is_renewable: isRenewable,
      renewal_frequency: isRenewable ? renewalFrequency : undefined,
      renewal_reminder_days: renewalReminderDays,
      auto_renew_enabled: autoRenewEnabled,
      has_time_slots: false, // Time slots now managed via Sport Facilities
      customer_id: customerId || profile?.customer_id!,
      created_by: profile?.id!,
    };

    try {
      if (tile) {
        await updateServiceTile.mutateAsync({ id: tile.id, ...serviceData });
      } else {
        await createServiceTile.mutateAsync(serviceData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving service tile:', error);
    }
  };

  const handleDelete = async () => {
    if (!tile) return;
    
    try {
      await deleteServiceTile.mutateAsync(tile.id);
      onClose();
    } catch (error) {
      console.error('Error deleting service tile:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Service Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Business License Application"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this service is for..."
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="guidance-text">
              Application Directions
              <span className="text-xs text-muted-foreground ml-2">(Optional - uses default if blank)</span>
            </Label>
            <Textarea
              id="guidance-text"
              value={guidanceText}
              onChange={(e) => setGuidanceText(e.target.value)}
              placeholder="Enter custom directions for applicants. If left blank, standard directions will be shown."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This text appears in the blue "Directions" box at the top of the application form. If left blank, standard directions will be displayed.
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="requires-payment">Requires Payment</Label>
              <p className="text-sm text-muted-foreground">
                This service requires payment processing
              </p>
            </div>
            <Switch
              id="requires-payment"
              checked={requiresPayment}
              onCheckedChange={setRequiresPayment}
            />
          </div>
          
          {/* Only show amount input if payment is required */}
          {requiresPayment && (
            <>
              <div>
                <Label htmlFor="amount">Service Fee (USD) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountDollars}
                    onChange={(e) => setAmountDollars(e.target.value)}
                    placeholder="0.00"
                    className="pl-10 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    required
                    disabled={allowUserDefinedAmount}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allow-user-defined-amount">Allow User-Defined Amount</Label>
                  <p className="text-sm text-muted-foreground">
                    Let users enter their own service fee amount (useful for variable fees like vehicle registration)
                  </p>
                </div>
                <Switch
                  id="allow-user-defined-amount"
                  checked={allowUserDefinedAmount}
                  onCheckedChange={(checked) => {
                    setAllowUserDefinedAmount(checked);
                    if (checked) {
                      setAmountDollars('0');
                    }
                  }}
                />
              </div>
            </>
          )}

          {/* Show "Free Service" badge when payment not required */}
          {!requiresPayment && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800">
                <strong>Free Service:</strong> This service does not require any payment. Users can submit applications without providing payment information.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Configuration - Only show if payment is required */}
      {requiresPayment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="merchant">Payment Merchant</Label>
              <Select value={selectedMerchantId} onValueChange={setSelectedMerchantId} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? "Loading merchants..." : "Select a merchant for payment processing"} />
                </SelectTrigger>
                <SelectContent>
                  {merchants?.map((merchant) => (
                    <SelectItem key={merchant.id} value={merchant.id}>
                      {merchant.merchant_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoading ? (
                <p className="text-sm text-muted-foreground mt-1">
                  Loading available merchants...
                </p>
              ) : !merchants?.length ? (
                <p className="text-sm text-muted-foreground mt-1">
                  No merchants available for this municipality
                </p>
              ) : !selectedMerchantId ? (
                <p className="text-sm text-muted-foreground mt-1">
                  Select a merchant to enable online payments for this service
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show informational message when payment not required */}
      {!requiresPayment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>No payment required:</strong> This service will be submitted for review only, without any payment processing. No merchant configuration is needed.
              </p>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Service Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="requires-review">Requires Manual Review</Label>
              <p className="text-sm text-muted-foreground">
                Applications will need approval before payment
              </p>
            </div>
            <Switch
              id="requires-review"
              checked={requiresReview}
              onCheckedChange={setRequiresReview}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="requires-document-upload">Require Document Upload</Label>
              <p className="text-sm text-muted-foreground">
                Applicants must upload supporting documents to submit this application
              </p>
            </div>
            <Switch
              id="requires-document-upload"
              checked={requiresDocumentUpload}
              onCheckedChange={setRequiresDocumentUpload}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="active">Active Service</Label>
              <p className="text-sm text-muted-foreground">
                Users can see and apply for this service
              </p>
            </div>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="renewable">Enable Renewals</Label>
              <p className="text-sm text-muted-foreground">
                Allow this service to be renewed automatically
              </p>
            </div>
            <Switch
              id="renewable"
              checked={isRenewable}
              onCheckedChange={setIsRenewable}
            />
          </div>
          
          {isRenewable && (
            <>
              <div>
                <Label htmlFor="renewal-frequency">Renewal Frequency</Label>
                <Select value={renewalFrequency} onValueChange={(value: 'annual' | 'quarterly') => setRenewalFrequency(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select renewal frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="reminder-days">Renewal Reminder (Days Before)</Label>
                <Input
                  id="reminder-days"
                  type="number"
                  min="1"
                  max="365"
                  value={renewalReminderDays}
                  onChange={(e) => setRenewalReminderDays(parseInt(e.target.value) || 30)}
                  placeholder="30"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Send renewal reminders this many days before expiration
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-renew">Allow Auto-Renewal</Label>
                  <p className="text-sm text-muted-foreground">
                    Users can opt for automatic renewal of this service
                  </p>
                </div>
                <Switch
                  id="auto-renew"
                  checked={autoRenewEnabled}
                  onCheckedChange={setAutoRenewEnabled}
                />
              </div>
            </>
          )}
          
          <div>
            <Label htmlFor="pdf-upload">Upload PDF Form (Optional)</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-background border-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                  onClick={() => document.getElementById('pdf-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose PDF File
                </Button>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfFileChange}
                  className="hidden"
                />
                <span className="text-sm text-muted-foreground">
                  Upload a PDF form file (max 10MB). This will replace any existing PDF.
                </span>
              </div>
              {pdfFile && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  Selected: {pdfFile.name}
                </p>
              )}
              {tile?.pdf_form_url && !pdfFile && (
                <p className="text-sm text-blue-600 flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  Current PDF: Available for download
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-between">
        {/* Delete Button (only show when editing existing tile) */}
        <div>
          {tile && (
            showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Are you sure?</p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteServiceTile.isPending}
                >
                  {deleteServiceTile.isPending ? 'Deleting...' : 'Yes, Delete'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Service
              </Button>
            )
          )}
        </div>

        {/* Save/Cancel Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createServiceTile.isPending || updateServiceTile.isPending || isUploadingPdf}
          >
            {isUploadingPdf 
              ? 'Uploading PDF...'
              : createServiceTile.isPending || updateServiceTile.isPending 
                ? 'Saving...' 
                : tile ? 'Update Service' : 'Create Service'
            }
          </Button>
        </div>
      </div>
    </form>
  );
}