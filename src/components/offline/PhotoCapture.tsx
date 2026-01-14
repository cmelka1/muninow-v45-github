import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, Trash2, CheckCircle } from 'lucide-react';
import { queueMedia } from '@/lib/offline-db';
import { v4 as uuidv4 } from 'uuid';

interface PhotoCaptureProps {
  inspectionId: string;
  itemId: string; // The form field ID this photo belongs to
  onCapture: (photoId: string, previewUrl: string) => void;
  initialPhotoUrl?: string; // If resuming or editing
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ 
  inspectionId, 
  itemId, 
  onCapture,
  initialPhotoUrl 
}) => {
  const [preview, setPreview] = useState<string | null>(initialPhotoUrl || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      await processAndSave(file);
    }
  };

  const processAndSave = async (file: File) => {
    setIsProcessing(true);
    try {
      // 1. Compress Options (Max 1080p, 0.8 quality)
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      // 2. Compress
      const compressedBlob = await imageCompression(file, options);
      
      // 3. Create ID and Queue
      const photoId = uuidv4();
      
      // 4. Save to IndexedDB (Asset Store)
      await queueMedia({
        id: photoId,
        inspectionId,
        itemId,
        blob: compressedBlob,
        mimeType: compressedBlob.type,
        status: 'pending',
        retryCount: 0,
        createdAt: Date.now(),
      });

      // 5. Update UI
      const objectUrl = URL.createObjectURL(compressedBlob);
      setPreview(objectUrl);
      onCapture(photoId, objectUrl); // Pass back the ID to the form to store as reference

    } catch (error) {
      console.error('Photo processing failed:', error);
      alert('Failed to process photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearPhoto = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Note: We don't delete from IDB immediately here to keep it simple, 
    // but in a real app we might want to clean up the orphaned blob.
  };

  return (
    <div className="flex flex-col gap-2 p-2 border rounded-md border-dashed border-gray-300">
      <input
        type="file"
        accept="image/*"
        capture="environment" // Forces rear camera on mobile
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {preview ? (
        <div className="relative group">
           <img 
             src={preview} 
             alt="Inspection capture" 
             className="w-full h-48 object-cover rounded-md" 
           />
           <div className="absolute top-2 right-2 flex gap-2">
             <Button 
               size="icon" 
               variant="destructive" 
               className="h-8 w-8 rounded-full shadow-lg"
               onClick={clearPhoto}
             >
               <Trash2 className="h-4 w-4" />
             </Button>
           </div>
           <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow">
             <CheckCircle className="h-3 w-3" /> Queued
           </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-md gap-2" onClick={() => fileInputRef.current?.click()}>
           <Button variant="outline" className="w-full h-12 gap-2" disabled={isProcessing}>
             <Camera className="h-5 w-5" />
             {isProcessing ? 'Compressing...' : 'Take Photo'}
           </Button>
           <p className="text-xs text-muted-foreground text-center">
             Photos are compressed & saved offline instantly.
           </p>
        </div>
      )}
    </div>
  );
};
