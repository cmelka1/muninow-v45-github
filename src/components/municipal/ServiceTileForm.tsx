import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Upload, FileText, DollarSign } from 'lucide-react';
import { FormFieldBuilder } from '@/components/municipal/FormFieldBuilder';
import { MunicipalServiceTile, useCreateServiceTile, useUpdateServiceTile } from '@/hooks/useMunicipalServiceTiles';
import { useMerchants } from '@/hooks/useMerchants';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ServiceTileFormProps {
  tile?: MunicipalServiceTile | null;
  customerId?: string;
  onClose: () => void;
}

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

export function ServiceTileForm({ tile, customerId, onClose }: ServiceTileFormProps) {
  const { profile } = useAuth();
  const { merchants } = useMerchants();
  const createServiceTile = useCreateServiceTile();
  const updateServiceTile = useUpdateServiceTile();
  
  // Form state
  const [title, setTitle] = useState(tile?.title || '');
  const [description, setDescription] = useState(tile?.description || '');
  const [amountDollars, setAmountDollars] = useState(tile ? (tile.amount_cents / 100).toString() : '0');
  const [requiresReview, setRequiresReview] = useState(tile?.requires_review || false);
  const [isActive, setIsActive] = useState(tile?.is_active !== false);
  const [autoPopulateUserInfo, setAutoPopulateUserInfo] = useState(tile?.auto_populate_user_info !== false);
  const [selectedMerchantId, setSelectedMerchantId] = useState(tile?.merchant_id || '');
  const [pdfFormUrl, setPdfFormUrl] = useState(tile?.pdf_form_url || '');
  const [formFields, setFormFields] = useState<FormField[]>(tile?.form_fields as FormField[] || []);

  // Filter merchants for this municipality - need to fetch them first
  const municipalMerchants = merchants?.filter(merchant => 
    merchant.customer_id === (customerId || profile?.customer_id)
  ) || [];

  const selectedMerchant = municipalMerchants?.find(m => m.id === selectedMerchantId);

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
    
    const serviceData = {
      title: title.trim(),
      description: description.trim() || undefined,
      amount_cents: amountCents,
      requires_review: requiresReview,
      is_active: isActive,
      auto_populate_user_info: autoPopulateUserInfo,
      merchant_id: selectedMerchantId || undefined,
      finix_merchant_id: selectedMerchant?.finix_merchant_id || undefined,
      // merchant_fee_profile_id will be set via merchant relationship
      pdf_form_url: pdfFormUrl.trim() || undefined,
      form_fields: formFields,
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
                className="pl-10"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Configuration */}
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
            <Select value={selectedMerchantId} onValueChange={setSelectedMerchantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a merchant for payment processing" />
              </SelectTrigger>
              <SelectContent>
                {municipalMerchants?.map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id}>
                    {merchant.merchant_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedMerchantId && (
              <p className="text-sm text-muted-foreground mt-1">
                Select a merchant to enable online payments for this service
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Application Form Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <FormFieldBuilder 
            fields={formFields}
            onFieldsChange={setFormFields}
          />
        </CardContent>
      </Card>

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
              <Label htmlFor="auto-populate">Auto-populate User Information</Label>
              <p className="text-sm text-muted-foreground">
                Pre-fill form with user's profile data
              </p>
            </div>
            <Switch
              id="auto-populate"
              checked={autoPopulateUserInfo}
              onCheckedChange={setAutoPopulateUserInfo}
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
          
          <div>
            <Label htmlFor="pdf-form">PDF Form URL (Optional)</Label>
            <Input
              id="pdf-form"
              value={pdfFormUrl}
              onChange={(e) => setPdfFormUrl(e.target.value)}
              placeholder="https://example.com/form.pdf"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Link to a downloadable PDF form for this service
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={createServiceTile.isPending || updateServiceTile.isPending}
        >
          {createServiceTile.isPending || updateServiceTile.isPending 
            ? 'Saving...' 
            : tile ? 'Update Service' : 'Create Service'
          }
        </Button>
      </div>
    </form>
  );
}