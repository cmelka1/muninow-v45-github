import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useTaxSubmissionDocuments, TaxDocument } from '@/hooks/useTaxSubmissionDocuments';

interface StagedDocument {
  id: string;
  file_name: string;
  original_file_name: string;
  document_type: string;
  description: string | null;
  file_size: number;
  content_type: string;
  upload_progress: number;
  status: 'staged' | 'confirmed' | 'failed';
  created_at: string;
}

interface TaxDocumentUploadProps {
  documents: StagedDocument[];
  onDocumentsChange: (documents: StagedDocument[]) => void;
  disabled?: boolean;
  stagingId?: string;
}

const DOCUMENT_TYPES = [
  { value: 'tax_form', label: 'Tax Form' },
  { value: 'receipts', label: 'Receipts' },
  { value: 'supporting_document', label: 'Supporting Document' },
  { value: 'backup_calculation', label: 'Backup Calculation' },
  { value: 'other', label: 'Other' }
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif'
];

export const TaxDocumentUpload: React.FC<TaxDocumentUploadProps> = ({
  documents,
  onDocumentsChange,
  disabled = false,
  stagingId
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<{ [key: string]: { type: string; description: string } }>({});
  
  const {
    uploadDocument,
    deleteDocument,
    uploadProgress,
    isUploading,
    isDeleting,
    stagingId: currentStagingId
  } = useTaxSubmissionDocuments(stagingId);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'File type not supported. Please upload PDF, DOC, DOCX, XLS, XLSX, or image files.';
    }
    
    return null;
  };

  const handleFileUpload = async (files: File[]) => {
    if (disabled || isUploading) return;
    
    const validFiles: File[] = [];
    
    // Validate all files first
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: 'File validation failed',
          description: `${file.name}: ${error}`,
          variant: 'destructive'
        });
        continue;
      }
      validFiles.push(file);
    }
    
    if (validFiles.length === 0) return;
    
    // Upload files immediately with default values
    for (const file of validFiles) {
      try {
        const result = await uploadDocument.mutateAsync({
          file,
          data: {
            staging_id: currentStagingId,
            document_type: 'supporting_document', // Default type
            description: '' // Default empty description
          }
        });
        
        // Add to local state for editing
        const newDoc: StagedDocument = {
          id: result.id,
          file_name: result.file_name,
          original_file_name: result.original_file_name,
          document_type: result.document_type,
          description: result.description,
          file_size: result.file_size,
          content_type: result.content_type,
          upload_progress: 100,
          status: 'staged' as const,
          created_at: result.created_at
        };
        
        onDocumentsChange([...documents, newDoc]);
        
        // Initialize editing state
        setSelectedDocuments(prev => ({
          ...prev,
          [result.id]: {
            type: result.document_type,
            description: result.description || ''
          }
        }));
        
      } catch (error) {
        console.error('Upload failed for file:', file.name, error);
        // Error already handled by mutation onError
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
    
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };

  const removeDocument = async (index: number) => {
    if (disabled || isDeleting) return;
    
    const document = documents[index];
    if (!document) return;
    
    try {
      await deleteDocument.mutateAsync(document.id);
      
      // Remove from local state
      const updatedDocuments = documents.filter((_, i) => i !== index);
      onDocumentsChange(updatedDocuments);
      
      // Clean up editing state
      setSelectedDocuments(prev => {
        const newState = { ...prev };
        delete newState[document.id];
        return newState;
      });
      
    } catch (error) {
      console.error('Failed to remove document:', error);
      // Error already handled by mutation onError
    }
  };

  const updateDocumentMetadata = (documentId: string, field: 'type' | 'description', value: string) => {
    if (disabled) return;
    
    setSelectedDocuments(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        [field === 'type' ? 'type' : 'description']: value
      }
    }));
    
    // Update in documents array for immediate UI feedback
    const updatedDocuments = documents.map(doc => 
      doc.id === documentId 
        ? { 
            ...doc, 
            [field === 'type' ? 'document_type' : 'description']: value 
          }
        : doc
    );
    onDocumentsChange(updatedDocuments);
  };

  const getFileIcon = (fileType: string, status: string, progress: number) => {
    if (status === 'failed') {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (status === 'staged' && progress === 100) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Supporting Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
            dragActive
              ? 'border-primary bg-primary/5 scale-105'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
            isUploading ? 'animate-pulse bg-primary/10 border-primary' : ''
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 mx-auto mb-2 text-primary animate-spin" />
          ) : (
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground mb-1">
            {isUploading ? 'Uploading documents...' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, DOC, DOCX, XLS, XLSX, or images (max 50MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || isUploading}
          />
        </div>

        {/* Overall Upload Progress */}
        {isUploading && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              <span className="text-sm font-medium text-primary">Uploading documents...</span>
            </div>
            <div className="space-y-2">
              {Object.entries(uploadProgress).map(([docId, progress]) => (
                <div key={docId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Document upload</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 animate-scale-in" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document List */}
        {documents.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Uploaded Documents</Label>
            {documents.map((doc, index) => {
              const docSettings = selectedDocuments[doc.id] || { 
                type: doc.document_type, 
                description: doc.description || '' 
              };
              const progress = uploadProgress[doc.id] || doc.upload_progress || 100;
              
              return (
                <div
                  key={doc.id}
                  className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getFileIcon(doc.content_type, doc.status, progress)}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{doc.original_file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </p>
                         {progress < 100 && (
                           <div className="mt-2 space-y-1 animate-fade-in">
                             <div className="flex items-center justify-between text-xs">
                               <span className="text-primary font-medium flex items-center gap-1">
                                 <Loader2 className="h-3 w-3 animate-spin" />
                                 Uploading...
                               </span>
                               <span className="text-primary font-medium">{progress}%</span>
                             </div>
                             <Progress value={progress} className="h-2 bg-primary/10" />
                           </div>
                         )}
                        {doc.status === 'failed' && (
                          <p className="text-xs text-destructive mt-1">
                            Upload failed. Please try again.
                          </p>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(index)}
                        disabled={disabled || isDeleting}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`doc-type-${doc.id}`} className="text-xs">
                          Document Type
                        </Label>
                        <Select
                          value={docSettings.type}
                          onValueChange={(value) => updateDocumentMetadata(doc.id, 'type', value)}
                          disabled={disabled || progress < 100}
                        >
                          <SelectTrigger id={`doc-type-${doc.id}`} className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor={`doc-desc-${doc.id}`} className="text-xs">
                          Description (Optional)
                        </Label>
                        <Input
                          id={`doc-desc-${doc.id}`}
                          placeholder="Brief description"
                          value={docSettings.description}
                          onChange={(e) => updateDocumentMetadata(doc.id, 'description', e.target.value)}
                          disabled={disabled || progress < 100}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};