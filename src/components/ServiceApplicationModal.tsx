import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, User } from 'lucide-react';
import { MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';
import { useCreateServiceApplication } from '@/hooks/useServiceApplications';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from '@/hooks/use-toast';

interface ServiceApplicationModalProps {
  tile: MunicipalServiceTile | null;
  isOpen: boolean;
  onClose: () => void;
}

const ServiceApplicationModal: React.FC<ServiceApplicationModalProps> = ({
  tile,
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [useAutoPopulate, setUseAutoPopulate] = useState(true);
  
  const { data: userProfile } = useUserProfile();
  const createApplication = useCreateServiceApplication();

  useEffect(() => {
    if (tile && isOpen) {
      // Initialize form data
      const initialData: Record<string, any> = {};
      
      // Auto-populate user info if enabled
      if (tile.auto_populate_user_info && useAutoPopulate && userProfile) {
        initialData.first_name = userProfile.first_name || '';
        initialData.last_name = userProfile.last_name || '';
        initialData.email = userProfile.email || '';
        initialData.phone = userProfile.phone || '';
        initialData.street_address = userProfile.street_address || '';
        initialData.apt_number = userProfile.apt_number || '';
        initialData.city = userProfile.city || '';
        initialData.state = userProfile.state || '';
        initialData.zip_code = userProfile.zip_code || '';
      }
      
      // Initialize form fields
      tile.form_fields?.forEach(field => {
        if (!initialData[field.id]) {
          initialData[field.id] = field.type === 'number' ? 0 : '';
        }
      });
      
      setFormData(initialData);
    }
  }, [tile, isOpen, useAutoPopulate, userProfile]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tile) return;

    // Validate required fields
    const missingFields = tile.form_fields?.filter(field => 
      field.required && (!formData[field.id] || formData[field.id] === '')
    ) || [];

    if (missingFields.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please fill in: ${missingFields.map(f => f.label).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await createApplication.mutateAsync({
        tile_id: tile.id,
        user_id: userProfile?.id || '',
        customer_id: tile.customer_id,
        form_data: formData,
        status: 'submitted',
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting application:', error);
    }
  };

  const renderFormField = (field: any) => {
    const { id, label, type, options, required, placeholder } = field;
    
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            key={id}
            value={formData[id] || ''}
            onChange={(e) => handleInputChange(id, e.target.value)}
            placeholder={placeholder}
            className="min-h-[100px]"
          />
        );
      
      case 'select':
        return (
          <Select key={id} value={formData[id] || ''} onValueChange={(value) => handleInputChange(id, value)}>
            <SelectTrigger>
              <SelectValue placeholder={placeholder || `Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'number':
        return (
          <Input
            key={id}
            type="number"
            value={formData[id] || ''}
            onChange={(e) => handleInputChange(id, parseFloat(e.target.value) || 0)}
            placeholder={placeholder}
          />
        );
      
      default:
        return (
          <Input
            key={id}
            type={type}
            value={formData[id] || ''}
            onChange={(e) => handleInputChange(id, e.target.value)}
            placeholder={placeholder}
          />
        );
    }
  };

  if (!tile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tile.title}
            <Badge variant="secondary">
              ${(tile.amount_cents / 100).toFixed(2)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {tile.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PDF Form Section */}
          {tile.pdf_form_url && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Official Form</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Please download and review the official form before completing this application.
              </p>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => window.open(tile.pdf_form_url, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF Form
              </Button>
            </div>
          )}

          {/* Auto-populate Toggle */}
          {tile.auto_populate_user_info && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-populate"
                checked={useAutoPopulate}
                onCheckedChange={(checked) => setUseAutoPopulate(checked as boolean)}
              />
              <Label htmlFor="auto-populate" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Use my profile information
              </Label>
            </div>
          )}

          {/* Dynamic Form Fields */}
          <div className="space-y-4">
            {tile.form_fields?.map((field) => (
              <div key={field.id}>
                <Label htmlFor={field.id} className="flex items-center gap-1">
                  {field.label}
                  {field.required && <span className="text-destructive">*</span>}
                </Label>
                {renderFormField(field)}
              </div>
            ))}
          </div>

          {/* Review Notice */}
          {tile.requires_review && (
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Review Required:</strong> This application will be reviewed by municipal staff before approval. 
                Payment will only be processed after approval.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createApplication.isPending}
            >
              {createApplication.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceApplicationModal;