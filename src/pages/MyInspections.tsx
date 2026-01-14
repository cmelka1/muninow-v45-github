import React, { useEffect, useState } from 'react';
import { useOffline } from '@/components/offline/OfflineProvider';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { getDB } from '@/lib/offline-db';
import { FormEngine } from '@/components/offline/FormEngine';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CloudDownload, Wifi, WifiOff, RefreshCw, ArrowLeft } from 'lucide-react';

export const MyInspections: React.FC = () => {
  const { isOnline, syncStatus } = useOffline();
  const { downloadAssignments, syncPendingWork, isSyncing } = useOfflineSync();
  const [offlineTasks, setOfflineTasks] = useState<any[]>([]);
  const [activeInspectionId, setActiveInspectionId] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);

  useEffect(() => {
    loadOfflineTasks();
  }, [syncStatus]); // Reload when sync finishes

  const loadOfflineTasks = async () => {
    const db = await getDB();
    const tasks = await db.getAll('tasks');
    setOfflineTasks(tasks);
  };

  const handleStartInspection = async (task: any) => {
    const db = await getDB();
    const template = await db.get('templates', task.templateId);
    
    if (!template) {
      alert("Template not found locally. Please re-download assignments.");
      return;
    }
    
    setActiveTemplate(template.schema);
    setActiveInspectionId(task.inspectionId);
  };

  if (activeInspectionId && activeTemplate) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Button variant="ghost" onClick={() => setActiveInspectionId(null)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <FormEngine 
          inspectionId={activeInspectionId} 
          template={activeTemplate}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Inspections</h1>
          <p className="text-muted-foreground">
             {isOnline 
               ? <span className="flex items-center gap-1 text-green-600"><Wifi className="h-4 w-4"/> Online Mode</span> 
               : <span className="flex items-center gap-1 text-amber-600"><WifiOff className="h-4 w-4"/> Offline Mode</span>
             }
          </p>
        </div>
        <div className="flex gap-2">
           <Button onClick={downloadAssignments} disabled={!isOnline || isSyncing} variant="outline">
             <CloudDownload className="mr-2 h-4 w-4" /> 
             {isSyncing ? 'Downloading...' : 'Download for Offline'}
           </Button>
           <Button onClick={syncPendingWork} disabled={!isOnline || isSyncing}>
             <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
             {isSyncing ? 'Syncing...' : 'Sync Now'}
           </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {offlineTasks.length === 0 ? (
          <div className="text-center py-12 border rounded-md border-dashed">
            <p className="text-muted-foreground">No downloaded inspections.</p>
            {isOnline && <Button variant="link" onClick={downloadAssignments}>Click to download assignments</Button>}
          </div>
        ) : (
          offlineTasks.map((task) => (
             <Card key={task.inspectionId} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleStartInspection(task)}>
               <CardHeader className="pb-2">
                 <div className="flex justify-between items-start">
                   <CardTitle className="text-lg">{task.details?.address || 'Unknown Address'}</CardTitle>
                   <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                     {task.status || 'Scheduled'}
                   </span>
                 </div>
               </CardHeader>
               <CardContent>
                 <p className="text-sm text-muted-foreground mb-2">Permit #{task.permitId.substring(0,8)}...</p>
                 <p className="text-sm font-medium text-blue-600">Tap to Start Inspection</p>
               </CardContent>
             </Card>
          ))
        )}
      </div>
    </div>
  );
};
