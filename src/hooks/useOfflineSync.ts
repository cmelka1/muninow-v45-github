import { useState } from 'react';
import { useOffline } from '@/components/offline/OfflineProvider';
import { supabase } from '@/integrations/supabase/client';
import { getDB, queueMedia, getPendingMedia, saveDraft, getDraft } from '@/lib/offline-db';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';

export const useOfflineSync = () => {
  const { isOnline, setSyncStatus } = useOffline();
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // --- DOWNLOAD (Online -> Offline) ---
  const downloadAssignments = async () => {
    if (!isOnline) {
      toast({ title: "Offline", description: "Cannot download assignments while offline.", variant: "destructive" });
      return;
    }

    setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      // 0. Get Session User
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      // 1. Fetch Assignments (Simulated RPC for now)
      // In real implementation: await supabase.rpc('get_my_assignments')
      const { data: assignments, error } = await supabase
        .from('permit_inspections')
        .select(`
          *,
          permit_applications (*),
          inspection_form_templates (*)
        `)
        .eq('status', 'scheduled')
        .eq('inspector_id', session.user.id); // Scope to current user

      if (error) throw error;

      // 2. Save to IDB
      const db = await getDB();
      const tx = db.transaction(['tasks', 'templates'], 'readwrite');
      
      const tasksStore = tx.objectStore('tasks');
      const templatesStore = tx.objectStore('templates');

      for (const item of (assignments || []) as any[]) {
        // Safe casting/mapping
        const assignment = item;
        const appData = assignment.permit_applications;
        
        // Save Task
        await tasksStore.put({
          inspectionId: assignment.id,
          permitId: assignment.permit_id,
          address: appData?.project_address || 'Unknown Address',
          type: 'Inspection', // Placeholder or derive from appData.permit_type_id
          scheduledDate: assignment.scheduled_date || new Date().toISOString(),
          details: assignment,
          templateId: assignment.template_id, // Assuming this column exists or is derived
          status: 'pending'
        });

        // Save Template
        if (assignment.inspection_form_templates) {
          await templatesStore.put(assignment.inspection_form_templates);
        }
      }

      await tx.done;
      toast({ title: "Download Complete", description: `Downloaded ${(assignments || []).length} assignments.` });
      setSyncStatus('synced');

    } catch (err) {
      console.error(err);
      toast({ title: "Download Failed", description: "Could not fetch assignments.", variant: "destructive" });
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };


  // --- UPLOAD (Offline -> Online) ---
  const syncPendingWork = async () => {
     if (!isOnline) return;

     setIsSyncing(true);
     setSyncStatus('syncing');

     try {
       // 0. Auth Check
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) {
          throw new Error("No active session. Please login.");
       }
       // Determine if token is expired, if so, try refresh (Supabase js client handles auto-refresh mostly, 
       // but explicit check is good for critical ops)

       const db = await getDB();
       
       // 1. Get All Drafts to Sync
       // For this MVP, we iterate all drafts. In prod, use a 'sync_queue'.
       const allDrafts = await db.getAll('form_data');

       for (const draft of allDrafts) {
         // A. Upload Media for this inspection
         const pendingMedia = await getPendingMedia(draft.inspectionId);
         
         const mediaMap: Record<string, string> = {}; // localId -> publicUrl

         for (const item of pendingMedia) {
           if (item.status === 'pending' || item.status === 'error') {
             // Upload
             const fileName = `${item.inspectionId}/${item.id}.${item.mimeType.split('/')[1]}`;
             const { data, error } = await supabase.storage
               .from('inspection-assets')
               .upload(`${session.user.id}/${fileName}`, item.blob, {
                 contentType: item.mimeType,
                 upsert: true
               });

             if (error) {
               console.error("Media Upload Error", error);
               continue; // Skip this file, try next
             }

             // Get Public URL
             const { data: { publicUrl } } = supabase.storage
               .from('inspection-assets')
               .getPublicUrl(`${session.user.id}/${fileName}`);
             
             mediaMap[item.id] = publicUrl;

             // Delete from Queue (Success)
             await db.delete('media_queue', item.id);
           }
         }

         // B. Replace Local Refs in JSON with Public URLs
         let finalJson = JSON.stringify(draft.data);
         Object.keys(mediaMap).forEach(localId => {
            // Regex to replace ID references
            // Simple replace for now, robust JSON traversal is better for nested
            finalJson = finalJson.replace(localId, mediaMap[localId]); 
         });
         const payload = JSON.parse(finalJson);

         // C. Submit Checklist Data
         // In real implementation: call RPC 'submit_inspection_checklist'
         // For now, insert directly
         const { error: insertError } = await supabase
           .from('inspection_checklists' as any)
           .insert({
             inspection_id: draft.inspectionId,
             checklist_data: payload,
             sync_status: 'synced', // or 'conflict' if checking timestamp
             device_timestamp: new Date().toISOString()
           });

         if (insertError) throw insertError;

         // C2. Update Inspection Status (Direct update for MVP)
         const { error: updateError } = await supabase
           .from('permit_inspections')
           .update({ 
              status: 'completed',
              completed_date: new Date().toISOString(),
              result: 'pass' // Default to pass, logic could be smarter
           })
           .eq('id', draft.inspectionId);

         if (updateError) {
            console.error("Failed to update status", updateError);
            // Non-blocking error, but worth logging
         }

         // D. Cleanup Draft
         await db.delete('form_data', draft.inspectionId);
       }

       toast({ title: "Sync Complete", description: "All offline work has been uploaded." });
       setSyncStatus('synced');

     } catch (err) {
       console.error("Sync Error", err);
       toast({ title: "Sync Failed", description: "Some items could not be uploaded.", variant: "destructive" });
       setSyncStatus('error');
     } finally {
       setIsSyncing(false);
     }
  };

  return {
    isSyncing,
    downloadAssignments,
    syncPendingWork
  };
};
