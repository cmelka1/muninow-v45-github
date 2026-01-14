import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormEngine } from '@/components/offline/FormEngine';
import { PermitInspection } from '@/hooks/usePermitInspections';
import { saveDraft, getDraft, saveInspection, saveTemplate } from '@/lib/offline-db';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface InspectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection: PermitInspection | null;
  onSuccess?: () => void;
}

export const InspectionFormDialog: React.FC<InspectionFormDialogProps> = ({
  open,
  onOpenChange,
  inspection,
  onSuccess
}) => {
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();
  const { syncPendingWork } = useOfflineSync();

  useEffect(() => {
    if (open && inspection) {
      const initializeForm = async () => {
        setIsReady(false);
        try {
          // 1. Seed Inspection to IDB
          await saveInspection({
            ...inspection,
            // Ensure compat with IDB schema expected by FormEngine/Sync
            status: inspection.status, // scheduled
            synced: true // It's from server
          });

          // 2. Seed Template into IDB
          if (inspection.inspection_form_templates) {
              const tmpl = inspection.inspection_form_templates;
              // Map structure (DB) to schema (App)
              await saveTemplate({
                ...tmpl,
                schema: tmpl.structure
              });
          }

          setIsReady(true);
        } catch (error) {
          console.error("Failed to initialize offline form", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load inspection form."
          });
        }
      };

      initializeForm();
    }
  }, [open, inspection, toast]);

    const handleClose = () => {
        // Optional: Trigger a sync attempt when closing if we think they are done?
        // For now, just close.
        onOpenChange(false);
    };

  if (!inspection) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
        {!isReady ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Loading inspection form...</p>
          </div>
        ) : (
          <div className="py-4">
             {/* @ts-ignore - FormEngine expects specific structure */}
            <FormEngine 
              inspectionId={inspection.id}
              template={inspection.inspection_form_templates ? {
                ...inspection.inspection_form_templates,
                schema: inspection.inspection_form_templates.structure
              } as any : undefined} 
              initialData={{}} // Draft will be loaded by FormEngine from IDB
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
