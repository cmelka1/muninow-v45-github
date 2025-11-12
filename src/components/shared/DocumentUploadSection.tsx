import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface UploadedDocument {
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

interface DocumentUploadSectionProps {
  documents: UploadedDocument[];
  onDocumentsChange: (docs: UploadedDocument[]) => void;
  required?: boolean;
  maxFiles?: number;
  allowedTypes?: string[];
  storageBucket: string;
  storagePathPrefix: string;
  userId: string;
  title?: string;
  description?: string;
}

export const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({
  documents,
  onDocumentsChange,
  required = false,
  maxFiles,
  allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif'
  ],
  storageBucket,
  storagePathPrefix,
  userId,
  title = 'Document Upload',
  description = 'Upload any documents that support your application',
}) => {
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported. Please upload PDF, DOC, DOCX, JPG, PNG, or GIF files.';
    }

    return null;
  };

  const uploadFile = async (file: File, documentId: string) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${userId}/${storagePathPrefix}/${documentId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(storageBucket)
      .upload(filePath, file);

    if (error) throw error;
    return { path: data.path, fileName };
  };

  const handleFileSelect = async (files: FileList) => {
    const fileArray = Array.from(files);

    // Validate file count if maxFiles is set
    if (maxFiles && documents.length + fileArray.length > maxFiles) {
      toast({
        title: 'Too Many Files',
        description: `You can only upload up to ${maxFiles} files.`,
        variant: 'destructive',
      });
      return;
    }

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: 'Invalid File',
          description: error,
          variant: 'destructive',
        });
        continue;
      }

      const documentId = crypto.randomUUID();
      const newDocument: UploadedDocument = {
        id: documentId,
        name: file.name,
        size: file.size,
        type: file.type,
        documentType: 'general',
        uploadProgress: 0,
        uploadStatus: 'uploading',
      };

      // Add document to list and keep a reference including the new item
      const docsWithNew = [...documents, newDocument];
      onDocumentsChange(docsWithNew);

      try {
        const { path } = await uploadFile(file, documentId);
        
        // Update document status to completed
        onDocumentsChange(
          docsWithNew.map(doc =>
            doc.id === documentId
              ? { ...doc, uploadStatus: 'completed' as const, filePath: path, uploadProgress: 100 }
              : doc
          )
        );

        toast({
          title: 'Upload Successful',
          description: `${file.name} has been uploaded.`,
        });
      } catch (error) {
        console.error('Upload error:', error);
        
        // Update document status to error
        onDocumentsChange(
          docsWithNew.map(doc =>
            doc.id === documentId
              ? { ...doc, uploadStatus: 'error' as const, error: 'Upload failed' }
              : doc
          )
        );

        toast({
          title: 'Upload Failed',
          description: `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleRemoveDocument = (documentId: string) => {
    const updatedDocuments = documents.filter(doc => doc.id !== documentId);
    onDocumentsChange(updatedDocuments);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-primary" />;
    }
    return <FileText className="h-5 w-5 text-primary" />;
  };

  return (
    <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          {title}
          <Badge variant={required ? "default" : "secondary"} className="ml-2">
            {required ? 'Required' : 'Optional'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground">
              Supporting Documents {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              {description}
            </p>

            {/* Drag and Drop Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="document-upload"
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
              />
              <label
                htmlFor="document-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <span className="text-sm font-medium text-foreground mb-1">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, JPG, or PNG (max 10MB each)
                </span>
              </label>
            </div>
          </div>

          {/* Uploaded Documents List */}
          {documents.length > 0 && (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(doc.type)}
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDocument(doc.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
