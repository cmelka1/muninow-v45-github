import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useBusinessLicenseDocuments } from "@/hooks/useBusinessLicenseDocuments";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AddBusinessLicenseDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licenseId: string;
  customerId: string;
  merchantId?: string;
  merchantName?: string;
  onSuccess: () => void;
}


export const AddBusinessLicenseDocumentDialog: React.FC<AddBusinessLicenseDocumentDialogProps> = ({
  open,
  onOpenChange,
  licenseId,
  customerId,
  merchantId,
  merchantName,
  onSuccess
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadDocument } = useBusinessLicenseDocuments();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [description, setDescription] = useState("");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 50MB",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType || !user?.id) {
      toast({
        title: "Missing information",
        description: "Please select a file and document type",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      await uploadDocument.mutateAsync({
        file: selectedFile,
        data: {
          license_id: licenseId,
          customer_id: customerId,
          merchant_id: merchantId,
          merchant_name: merchantName,
          file_name: selectedFile.name,
          content_type: selectedFile.type,
          file_size: selectedFile.size,
          document_type: documentType,
          description: description || undefined,
        }
      });

      toast({
        title: "Document uploaded",
        description: "Your document has been successfully uploaded to the business license"
      });

      // Reset form
      setSelectedFile(null);
      setDocumentType("");
      setDescription("");
      onSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
          <DialogDescription>
            Upload a new document to this business license application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="document-type">Document Type *</Label>
            <Input
              id="document-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              placeholder="Enter document type (e.g., Application Form, Certificate, Insurance Documents)"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the document"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="file-upload">Select File *</Label>
            {!selectedFile ? (
              <div className="mt-2">
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 hover:bg-muted/25 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Click to upload a file</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, DOCX, JPG, PNG, TIFF (max 50MB)
                    </p>
                  </div>
                  <Button 
                    type="button"
                    variant="outline" 
                    className="mt-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById('file-upload')?.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.tif"
                  className="sr-only"
                />
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between p-3 border rounded-md bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeSelectedFile}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !selectedFile || !documentType}>
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};