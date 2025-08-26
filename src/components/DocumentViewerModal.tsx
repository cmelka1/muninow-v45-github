import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    file_name: string;
    storage_path: string;
    file_size: number;
  } | null;
  bucketName?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  document,
  bucketName = 'permit-documents'
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && document) {
      loadDocument();
    } else {
      // Reset state and cleanup blob URL when modal closes
      if (signedUrl) {
        URL.revokeObjectURL(signedUrl);
      }
      setSignedUrl(null);
      setError(null);
      setZoom(100);
    }
    
    // Cleanup on unmount
    return () => {
      if (signedUrl) {
        URL.revokeObjectURL(signedUrl);
      }
    };
  }, [isOpen, document]);

  const loadDocument = async () => {
    if (!document) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(document.storage_path);

      if (error) {
        console.error('Error downloading document:', error);
        setError('Failed to load document. Please try again.');
        return;
      }

      if (data) {
        const blobUrl = URL.createObjectURL(data);
        setSignedUrl(blobUrl);
      } else {
        setError('Unable to load document.');
      }
    } catch (error) {
      console.error('Error loading document:', error);
      setError('Failed to load document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(document.storage_path);

      if (error) {
        console.error('Error downloading document:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to download document. Please try again.",
        });
        return;
      }

      if (data) {
        const url = URL.createObjectURL(data);
        const a = globalThis.document.createElement('a');
        a.href = url;
        a.download = document.file_name;
        globalThis.document.body.appendChild(a);
        a.click();
        globalThis.document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Download started",
          description: `${document.file_name} is being downloaded.`,
        });
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download document. Please try again.",
      });
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  const isImageFile = document?.file_name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/);
  const isPdfFile = document?.file_name.toLowerCase().endsWith('.pdf');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {document?.file_name || 'Document Viewer'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {signedUrl && (
                <>
                  {isPdfFile && (
                    <>
                      <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">{zoom}%</span>
                      <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}
              <DialogClose asChild>
                <Button variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-gray-50 rounded-lg">
          {isLoading && (
            <div className="h-full flex flex-col justify-center items-center space-y-4">
              <Skeleton className="h-32 w-32" />
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          )}

          {error && (
            <div className="h-full flex flex-col justify-center items-center space-y-4">
              <div className="text-center">
                <p className="text-destructive font-medium">Failed to load document</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button variant="outline" onClick={loadDocument} className="mt-4">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {signedUrl && !isLoading && !error && (
            <div className="h-full overflow-auto">
              {isImageFile ? (
                <div className="flex justify-center items-center h-full p-4">
                  <img
                    src={signedUrl}
                    alt={document?.file_name}
                    style={{ 
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: 'center',
                      maxWidth: '100%',
                      maxHeight: '100%'
                    }}
                    className="object-contain"
                  />
                </div>
              ) : isPdfFile ? (
                <iframe
                  src={`${signedUrl}#zoom=${zoom}`}
                  className="w-full h-full border-0"
                  title={document?.file_name}
                />
              ) : (
                <div className="h-full flex flex-col justify-center items-center space-y-4">
                  <div className="text-center">
                    <p className="font-medium">Preview not available</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This file type cannot be previewed in the browser
                    </p>
                    <Button variant="outline" onClick={handleDownload} className="mt-4">
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};