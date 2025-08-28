import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TaxDocument {
  id?: string;
  file: File;
  documentType: string;
  description: string;
  uploaded?: boolean;
  storagePath?: string;
  uploadProgress?: number;
  error?: string;
}

export interface StagedTaxDocument {
  id: string;
  staging_id: string;
  document_type: string;
  file_name: string;
  original_file_name: string;
  content_type: string;
  file_size: number;
  storage_path: string;
  description: string | null;
  uploaded_by: string;
  status: 'staged' | 'confirmed' | 'failed';
  upload_progress: number;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadTaxDocumentData {
  staging_id: string;
  document_type: string;
  description?: string;
}

export const useTaxSubmissionDocuments = (stagingId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set());

  // Generate unique staging ID for this upload session
  const currentStagingId = stagingId || crypto.randomUUID();

  const generateStoragePath = (userId: string, fileName: string): string => {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${userId}/${timestamp}_${sanitizedFileName}`;
  };

  // Track upload states for better error handling
  const [uploadStates, setUploadStates] = useState<Record<string, 'uploading' | 'success' | 'failed'>>({});

  // Immediate upload mutation (like business license documents)
  const uploadDocument = useMutation({
    mutationFn: async ({ file, data, fileId: providedFileId }: { 
      file: File; 
      data: UploadTaxDocumentData; 
      fileId?: string; 
    }) => {
      if (!user) throw new Error('User must be authenticated');

      const fileId = providedFileId || crypto.randomUUID();
      const fileName = `${fileId}-${file.name}`;
      const filePath = `tax-documents/${currentStagingId}/${fileName}`;

      console.log(`[Upload] Starting upload for file: ${file.name}, fileId: ${fileId}`);

      // Track uploading document and state
      setUploadingDocuments(prev => new Set(prev).add(fileId));
      setUploadStates(prev => ({ ...prev, [fileId]: 'uploading' }));
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      try {
        // Upload file to storage with progress tracking
        const { error: uploadError } = await supabase.storage
          .from('tax-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error(`[Upload] Storage upload failed for ${file.name}:`, uploadError);
          throw uploadError;
        }

        // Update progress to 50% after storage upload
        setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));

        // Create staged document record
        const { data: document, error: docError } = await supabase
          .from('tax_submission_documents')
          .insert({
            staging_id: data.staging_id,
            document_type: data.document_type,
            file_name: fileName,
            original_file_name: file.name,
            content_type: file.type,
            file_size: file.size,
            storage_path: filePath,
            description: data.description || null,
            uploaded_by: user.id,
            status: 'staged',
            upload_progress: 100,
            retry_count: 0,
            tax_submission_id: null // Will be updated when payment succeeds
          })
          .select()
          .single();

        if (docError) {
          console.error(`[Upload] Database insert failed for ${file.name}:`, docError);
          // Clean up uploaded file if database insert fails
          await supabase.storage
            .from('tax-documents')
            .remove([filePath]);
          throw docError;
        }

        // Complete progress and update states
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        setUploadStates(prev => ({ ...prev, [fileId]: 'success' }));
        setUploadingDocuments(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        
        console.log(`[Upload] Successfully completed upload for ${file.name}`);
        return { ...document, fileId };
      } catch (error) {
        // Properly handle errors with the correct fileId
        console.error(`[Upload] Upload failed for ${file.name}, fileId: ${fileId}:`, error);
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        setUploadStates(prev => ({ ...prev, [fileId]: 'failed' }));
        setUploadingDocuments(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staged-tax-documents'] });
      toast({
        title: 'Document uploaded',
        description: 'Document uploaded and staged for tax submission.'
      });
    },
    onError: (error: any, variables) => {
      console.error('[Upload] Upload mutation error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload document. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Delete staged document mutation
  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      // Get document info first
      const { data: document, error: fetchError } = await supabase
        .from('tax_submission_documents')
        .select('storage_path')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('tax-documents')
        .remove([document.storage_path]);

      if (storageError) throw storageError;

      // Delete document record
      const { error: deleteError } = await supabase
        .from('tax_submission_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staged-tax-documents'] });
      toast({
        title: 'Document removed',
        description: 'Document removed from staging area.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Get staged documents for current staging session
  const getStagedDocuments = async (): Promise<StagedTaxDocument[]> => {
    const { data, error } = await supabase
      .from('tax_submission_documents')
      .select('*')
      .eq('staging_id', currentStagingId)
      .eq('status', 'staged')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch staged documents: ${error.message}`);
    }
    
    return (data as StagedTaxDocument[]) || [];
  };

  // Get confirmed documents for a tax submission
  const getConfirmedDocuments = async (taxSubmissionId: string): Promise<StagedTaxDocument[]> => {
    const { data, error } = await supabase
      .from('tax_submission_documents')
      .select('*')
      .eq('tax_submission_id', taxSubmissionId)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch confirmed documents: ${error.message}`);
    }
    
    return (data as StagedTaxDocument[]) || [];
  };

  // Enhanced getDocuments method - improved fallback for documents
  const getDocuments = async (taxSubmissionId: string): Promise<StagedTaxDocument[]> => {
    // First try to get confirmed documents
    let documents = await getConfirmedDocuments(taxSubmissionId);
    
    // If no confirmed documents found, get all documents for this tax submission
    if (documents.length === 0) {
      const { data, error } = await supabase
        .from('tax_submission_documents')
        .select('*')
        .eq('tax_submission_id', taxSubmissionId)
        .in('status', ['confirmed', 'staged'])
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }
      
      documents = (data as StagedTaxDocument[]) || [];
    }
    
    return documents;
  };

  // Backward compatibility - legacy uploadMultipleDocuments method
  const uploadMultipleDocuments = async (
    documents: TaxDocument[], 
    stagingIdOverride?: string
  ): Promise<void> => {
    if (!user || documents.length === 0) return;
    
    const uploadPromises = documents.map(doc => 
      uploadDocument.mutateAsync({ 
        file: doc.file, 
        data: { 
          staging_id: stagingIdOverride || currentStagingId,
          document_type: doc.documentType,
          description: doc.description
        } 
      })
    );
    
    await Promise.all(uploadPromises);
  };

  const getDocumentUrl = async (storagePath: string) => {
    const { data } = await supabase.storage
      .from('tax-documents')
      .createSignedUrl(storagePath, 3600);

    return data?.signedUrl;
  };

  // Cleanup staging area (for error recovery)
  const cleanupStagingArea = async () => {
    try {
      const { error } = await supabase.rpc('cleanup_staged_tax_documents', {
        p_staging_id: currentStagingId
      });
      
      if (error) {
        console.error('Failed to cleanup staging area:', error);
      }
    } catch (error) {
      console.error('Error during staging cleanup:', error);
    }
  };

  // Clear failed upload state and allow retry
  const clearFailedUpload = (fileId: string) => {
    console.log(`[Upload] Clearing failed upload state for fileId: ${fileId}`);
    setUploadStates(prev => {
      const updated = { ...prev };
      delete updated[fileId];
      return updated;
    });
    setUploadProgress(prev => {
      const updated = { ...prev };
      delete updated[fileId];
      return updated;
    });
  };

  // Calculate if all uploads are complete
  const allUploadsComplete = uploadingDocuments.size === 0 && !uploadDocument.isPending;

  return {
    uploadDocument,
    deleteDocument,
    getStagedDocuments,
    getConfirmedDocuments,
    getDocuments, // Backward compatibility
    uploadMultipleDocuments, // Backward compatibility
    getDocumentUrl,
    cleanupStagingArea,
    clearFailedUpload,
    uploadProgress,
    setUploadProgress,
    uploadStates,
    stagingId: currentStagingId,
    isUploading: uploadDocument.isPending,
    isDeleting: deleteDocument.isPending,
    uploading: uploadDocument.isPending, // Backward compatibility
    allUploadsComplete,
    hasUploadingDocuments: uploadingDocuments.size > 0,
    uploadingDocumentsCount: uploadingDocuments.size
  };
};