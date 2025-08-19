import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { FileText, Download, User, Copy, ExternalLink, AlertCircle } from 'lucide-react';
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
  const [pdfAccessBlocked, setPdfAccessBlocked] = useState(false);
  
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
        initialData.business_legal_name = userProfile.business_legal_name || '';
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
    let missingFields: { label: string }[] = tile.form_fields?.filter(field => 
      field.required && (!formData[field.id] || formData[field.id] === '')
    ).map(field => ({ label: field.label })) || [];

    // Add amount validation for user-defined amounts
    if (tile.allow_user_defined_amount && (!formData.amount_cents || formData.amount_cents <= 0)) {
      missingFields = [...missingFields, { label: 'Service Fee Amount' }];
    }

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
        amount_cents: tile.allow_user_defined_amount ? formData.amount_cents : tile.amount_cents,
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
          <RichTextEditor
            key={id}
            content={formData[id] || ''}
            onChange={(content) => handleInputChange(id, content)}
            placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
            className="w-full"
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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-8">
        <DialogHeader className="space-y-4 pb-6 border-b">
          <div className="space-y-2">
            <DialogTitle className="text-xl font-semibold">
              {tile.title}
            </DialogTitle>
            {!tile.allow_user_defined_amount && (
              <Badge variant="secondary" className="text-sm px-3 py-1 w-fit">
                ${(tile.amount_cents / 100).toFixed(2)}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-base leading-relaxed">
            {tile.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 pt-6">
          {/* PDF Form Section */}
          {tile.pdf_form_url && (
            <div className="border rounded-lg p-6">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="space-y-3 flex-1">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Official Form Available</h3>
                    <p className="text-sm text-muted-foreground">
                      View the official PDF form which will open in a new tab. You can download it from there if needed.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        try {
                          if (!tile.pdf_form_url) {
                            throw new Error('PDF form URL not available');
                          }
                          
                          const newWindow = window.open(tile.pdf_form_url, '_blank', 'noopener,noreferrer');
                          
                          // Check if popup was blocked
                          setTimeout(() => {
                            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                              setPdfAccessBlocked(true);
                              toast({
                                title: "Popup Blocked",
                                description: "Please allow popups for this site or use the direct link below.",
                                variant: "destructive",
                              });
                            } else {
                              setPdfAccessBlocked(false);
                              toast({
                                title: "Opening PDF Form",
                                description: "The official form is opening in a new tab.",
                              });
                            }
                          }, 100);
                        } catch (error) {
                          console.error('Error opening PDF:', error);
                          setPdfAccessBlocked(true);
                          toast({
                            title: "Error Opening PDF",
                            description: "Unable to open the PDF form. Please use the direct link below.",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="w-fit"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open PDF Form
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(tile.pdf_form_url!).then(() => {
                          toast({
                            title: "Link Copied",
                            description: "PDF form link copied to clipboard.",
                          });
                        }).catch(() => {
                          toast({
                            title: "Copy Failed",
                            description: "Unable to copy link. Please manually copy the URL below.",
                            variant: "destructive",
                          });
                        });
                      }}
                      className="w-fit"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                  
                  {/* Fallback options when popup is blocked */}
                  {pdfAccessBlocked && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div className="space-y-2">
                          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                            Having trouble accessing the PDF?
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            • Try allowing popups for this site in your browser settings
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            • Or copy this direct link: 
                            <code className="ml-1 px-1 bg-amber-100 dark:bg-amber-900 rounded text-xs break-all">
                              {tile.pdf_form_url}
                            </code>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Dynamic Form Fields */}
          {tile.form_fields && tile.form_fields.length > 0 && (
            <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Application Information
                </CardTitle>
                {tile.auto_populate_user_info && (
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="auto-populate" className="text-sm text-muted-foreground">
                      Use Profile Information
                    </Label>
                    <Switch
                      id="auto-populate"
                      checked={useAutoPopulate}
                      onCheckedChange={(checked) => setUseAutoPopulate(checked)}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {tile.form_fields?.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id} className="flex items-center gap-1 text-sm">
                        {field.label}
                        {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      {renderFormField(field)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* User-Defined Amount Section */}
          {tile.allow_user_defined_amount && (
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Service Fee</h3>
                <Badge variant="outline" className="text-sm px-2 py-1">
                  {formData.amount_cents ? `$${(formData.amount_cents / 100).toFixed(2)}` : 'Not set'}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-1 text-sm">
                  Amount
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount_cents ? (formData.amount_cents / 100).toString() : ''}
                    onChange={(e) => handleInputChange('amount_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                    placeholder="0.00"
                    className="pl-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Review Notice */}
          {tile.requires_review && (
            <div className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <span className="font-medium">Review Required:</span> This application will be reviewed by municipal staff before approval. 
                Payment will only be processed after approval.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-6 border-t">
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