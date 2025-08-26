import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, X, Maximize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    file_name: string;
    storage_path: string;
    content_type: string;
    file_size: number;
  } | null;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  open,
  onOpenChange,
  document: doc
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && doc) {
      loadDocument();
    } else {
      setSignedUrl(null);
      setError(null);
    }
  }, [open, doc]);

  const loadDocument = async () => {
    if (!doc) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.storage
        .from('permit-documents')
        .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        setError('Failed to load document');
        return;
      }

      if (data?.signedUrl) {
        setSignedUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error loading document:', error);
      setError('Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!doc) return;

    try {
      const { data, error } = await supabase.storage
        .from('permit-documents')
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
        const a = window.document.createElement('a');
        a.href = url;
        a.download = doc.file_name;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
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
  };

  const isPDF = doc?.content_type === 'application/pdf';
  const isImage = doc?.content_type?.startsWith('image/');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 truncate">
              {doc?.file_name || 'Document'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!doc}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {doc && (
            <p className="text-sm text-muted-foreground">
              {(doc.file_size / 1024).toFixed(1)} KB
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-muted/10">
          {isLoading && (
            <div className="h-full flex flex-col gap-4 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {error && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-6">
                <p className="text-destructive mb-2">Failed to load document</p>
                <Button variant="outline" onClick={loadDocument}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {signedUrl && !error && !isLoading && (
            <>
              {isPDF && (
                <iframe
                  src={signedUrl}
                  className="w-full h-full border-0"
                  title={doc?.file_name}
                />
              )}
              {isImage && (
                <div className="h-full flex items-center justify-center p-4">
                  <img
                    src={signedUrl}
                    alt={doc?.file_name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              {!isPDF && !isImage && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center p-6">
                    <p className="text-muted-foreground mb-4">
                      Preview not available for this file type
                    </p>
                    <Button onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};