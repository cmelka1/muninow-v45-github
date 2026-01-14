import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Eraser, Save, CheckCircle } from 'lucide-react';
import { queueMedia } from '@/lib/offline-db';
import { v4 as uuidv4 } from 'uuid';

interface SignaturePadProps {
  inspectionId: string;
  role: 'inspector' | 'customer';
  onSave: (signatureId: string, name?: string) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ 
  inspectionId, 
  role, 
  onSave 
}) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [typedName, setTypedName] = useState('');
  const [activeTab, setActiveTab] = useState('draw');
  const [saved, setSaved] = useState(false);

  const clear = () => {
    sigCanvas.current?.clear();
    setTypedName('');
    setSaved(false);
  };

  const handleSave = async () => {
    let blob: Blob | null = null;
    let finalName = '';

    if (activeTab === 'draw') {
      if (sigCanvas.current?.isEmpty()) {
        alert('Please sign before saving.');
        return;
      }
      // Get Blob from Canvas
      const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
      if (dataUrl) {
         const res = await fetch(dataUrl);
         blob = await res.blob();
      }
    } else {
      // Type Mode
      if (!typedName.trim()) {
        alert('Please type a name.');
        return;
      }
      finalName = typedName;
      
      // Convert Text to Image Blob for consistency in storage
      // Create a temporary canvas to render the font
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = '48px "Dancing Script", cursive';
        const textWidth = ctx.measureText(typedName).width;
        canvas.width = textWidth + 40;
        canvas.height = 100;
        ctx.font = '48px "Dancing Script", cursive'; // Reset font after resize
        ctx.fillStyle = 'black';
        ctx.fillText(typedName, 20, 70); // Padding
        
        const dataUrl = canvas.toDataURL('image/png');
        const res = await fetch(dataUrl);
        blob = await res.blob();
      }
    }

    if (blob) {
      const signatureId = uuidv4();
      
      // Save to media queue just like a photo
      await queueMedia({
        id: signatureId,
        inspectionId,
        itemId: `signature_${role}`,
        blob: blob,
        mimeType: 'image/png',
        status: 'pending',
        retryCount: 0,
        createdAt: Date.now(),
        caption: finalName ? `Signed by ${finalName}` : `Signature (${role})`
      });

      setSaved(true);
      onSave(signatureId, finalName);
    }
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-green-50 border border-green-200 rounded-md">
        <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
        <p className="text-sm font-medium text-green-800">Signature Saved</p>
        <Button variant="link" size="sm" onClick={() => setSaved(false)} className="mt-2 text-green-700">
          Redo Signature
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-4 bg-white shadow-sm">
      <h3 className="text-sm font-medium mb-3">
        {role === 'inspector' ? 'Inspector Signature' : 'Customer Signature'}
      </h3>
      
      <Tabs defaultValue="draw" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="draw">Draw</TabsTrigger>
          <TabsTrigger value="type">Type</TabsTrigger>
        </TabsList>
        
        <TabsContent value="draw" className="border rounded-md bg-gray-50 touch-none">
          <SignatureCanvas 
            ref={sigCanvas}
            penColor="black"
            canvasProps={{
              className: "w-full h-40 rounded-md cursor-crosshair"
            }}
            backgroundColor="transparent"
          />
        </TabsContent>
        
        <TabsContent value="type">
          <div className="flex flex-col gap-4 py-4">
            <Input 
              placeholder="Type Full Name" 
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
            />
            {typedName && (
              <div className="p-4 bg-gray-50 border rounded-md text-center">
                <p style={{ fontFamily: '"Dancing Script", cursive', fontSize: '2rem' }}>
                  {typedName}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              By typing your name, you acknowledge this as your electronic signature.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" size="sm" onClick={clear}>
          <Eraser className="h-4 w-4 mr-2" /> Clear
        </Button>
        <Button size="sm" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" /> Save Signature
        </Button>
      </div>
    </div>
  );
};
