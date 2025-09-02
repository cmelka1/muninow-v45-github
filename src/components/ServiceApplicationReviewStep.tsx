import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, FileText, User, Building } from 'lucide-react';
import { MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';
import { formatCurrency } from '@/lib/formatters';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  documentType: string;
  description?: string;
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error';
  filePath?: string;
  error?: string;
}

interface ServiceApplicationReviewStepProps {
  tile: MunicipalServiceTile;
  formData: Record<string, any>;
  uploadedDocuments: UploadedDocument[];
  onEdit: () => void;
}

const ServiceApplicationReviewStep: React.FC<ServiceApplicationReviewStepProps> = ({
  tile,
  formData,
  uploadedDocuments,
  onEdit,
}) => {
  const getFieldDisplayValue = (field: any, value: any) => {
    if (!value) return 'Not provided';
    
    return value.toString();
  };

  const isRichTextContent = (content: string) => {
    return content.includes('<') && content.includes('>');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentTypeLabel = (documentType: string) => {
    const typeMap: { [key: string]: string } = {
      'general': 'General Document',
      'plans': 'Plans & Drawings',
      'specifications': 'Specifications',
      'inspection': 'Inspection Report',
      'survey': 'Survey',
      'other': 'Other'
    };
    return typeMap[documentType] || documentType;
  };

  const completedDocuments = uploadedDocuments.filter(doc => doc.uploadStatus === 'completed');
  const totalAmount = tile.allow_user_defined_amount ? (formData.amount_cents || 0) : (tile.amount_cents || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Review Your Application</h3>
          <p className="text-muted-foreground text-sm">
            Please review all information before {tile.requires_review ? 'submitting' : 'proceeding to payment'}
          </p>
        </div>
        <Button variant="outline" onClick={onEdit} className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Service Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building className="h-5 w-5" />
            Service Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="font-medium">Service:</span> {tile.title}
          </div>
          {tile.description && (
            <div>
              <span className="font-medium">Description:</span>
              <p className="text-sm text-muted-foreground mt-1">{tile.description}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="font-medium">Amount:</span>
            {totalAmount ? (
              <Badge variant="secondary">
                {formatCurrency(totalAmount / 100)}
              </Badge>
            ) : (
              <span className="text-muted-foreground">No fee</span>
            )}
          </div>
          {tile.requires_review && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Review:</span>
              <Badge variant="outline">Manual review required</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Data */}
      {tile.form_fields && tile.form_fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5" />
              Application Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tile.form_fields.map((field) => (
              <div key={field.id} className="border-b border-border last:border-b-0 pb-3 last:pb-0">
                <span className="font-medium">{field.label}:</span>
                 <div className="mt-1">
                   {field.type === 'textarea' ? (
                     <div className="max-h-24 overflow-y-auto">
                       {formData[field.id] && isRichTextContent(formData[field.id]) ? (
                         <SafeHtmlRenderer 
                           content={formData[field.id]} 
                           className="text-sm text-muted-foreground"
                         />
                       ) : (
                         <span className="text-sm text-muted-foreground">
                           {getFieldDisplayValue(field, formData[field.id])}
                         </span>
                       )}
                     </div>
                   ) : (
                     <span className="text-sm">
                       {getFieldDisplayValue(field, formData[field.id])}
                     </span>
                   )}
                 </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents */}
      {completedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Uploaded Documents ({completedDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{getDocumentTypeLabel(doc.documentType)}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Uploaded
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceApplicationReviewStep;