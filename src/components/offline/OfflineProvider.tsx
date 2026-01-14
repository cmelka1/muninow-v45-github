import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OfflineContextType {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'synced';
  lastSyncTime: Date | null;
  checkConnection: () => Promise<boolean>;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'synced') => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'synced'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { toast } = useToast();

  // Robust connection checker (pings a tiny resource)
  const checkConnection = async (): Promise<boolean> => {
    if (!navigator.onLine) return false;
    
    try {
      // Ping a reliable endpoint (e.g., Supabase health or a defined ping edge function)
      // For now, we assume if we can fetch the favicon or a small asset, we are good.
      // Using cache: 'no-store' to bypass browser cache
      const res = await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
      return res.ok;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    const handleOnline = async () => {
      const live = await checkConnection();
      setIsOnline(live);
      if (live) {
        toast({
          title: "Back Online",
          description: "Connection restored. You can now sync your work.",
          variant: "default",
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You are Offline",
        description: "Changes will be saved locally and synced when you return online.",
        variant: "destructive", // Using destructive color to grab attention
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic "Heartbeat" check every 30 seconds if we think we are online
    // to detect "Ghost" connections
    const heartbeat = setInterval(async () => {
      if (navigator.onLine) {
        const live = await checkConnection();
        if (live !== isOnline) {
          setIsOnline(live);
        }
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(heartbeat);
    };
  }, [isOnline, toast]);

  return (
    <OfflineContext.Provider 
      value={{ 
        isOnline, 
        syncStatus, 
        lastSyncTime,
        checkConnection,
        setSyncStatus 
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
