import { useState, useEffect, useCallback } from 'react';

interface FinixAuthInstance {
  getSessionKey: () => string;
  connect: (merchantId: string, callback?: (sessionKey: string) => void) => void;
}

export const useFinixAuth = (merchantId: string | null | undefined) => {
  const [finixSessionKey, setFinixSessionKey] = useState<string | null>(null);
  const [isFinixReady, setIsFinixReady] = useState(false);
  const [finixAuth, setFinixAuth] = useState<FinixAuthInstance | null>(null);

  // Initialize Finix Auth when merchant ID is available
  useEffect(() => {
    if (!merchantId) {
      console.log('⚠️ No merchant ID available for Finix Auth');
      return;
    }

    // Check if Finix library is loaded
    if (typeof window.Finix === 'undefined') {
      console.error('❌ Finix JavaScript library not loaded');
      setIsFinixReady(false);
      return;
    }

    try {
      console.log('🔐 Initializing Finix Auth with merchant:', merchantId);
      
      const auth = (window as any).Finix.Auth(
        'sandbox', // Change to 'live' for production
        merchantId,
        (sessionKey: string) => {
          console.log('✅ Finix session key received:', sessionKey);
          setFinixSessionKey(sessionKey);
          setIsFinixReady(true);
        }
      );

      setFinixAuth(auth);

      // Get initial session key
      const initialKey = auth.getSessionKey();
      if (initialKey) {
        console.log('✅ Initial Finix session key:', initialKey);
        setFinixSessionKey(initialKey);
        setIsFinixReady(true);
      }
    } catch (error) {
      console.error('❌ Error initializing Finix Auth:', error);
      setIsFinixReady(false);
    }
  }, [merchantId]);

  // Reconnect when merchant changes
  useEffect(() => {
    if (!finixAuth || !merchantId || !isFinixReady) {
      return;
    }

    try {
      console.log('🔄 Reconnecting Finix Auth for merchant:', merchantId);
      finixAuth.connect(merchantId, (sessionKey: string) => {
        console.log('✅ New Finix session key after reconnect:', sessionKey);
        setFinixSessionKey(sessionKey);
      });
    } catch (error) {
      console.error('❌ Error reconnecting Finix Auth:', error);
    }
  }, [merchantId, finixAuth, isFinixReady]);

  // Refresh session key on demand
  const refreshSessionKey = useCallback(() => {
    if (!finixAuth) {
      console.warn('⚠️ Cannot refresh: Finix Auth not initialized');
      return null;
    }

    try {
      const newKey = finixAuth.getSessionKey();
      console.log('🔄 Refreshed Finix session key:', newKey);
      setFinixSessionKey(newKey);
      return newKey;
    } catch (error) {
      console.error('❌ Error refreshing session key:', error);
      return null;
    }
  }, [finixAuth]);

  return {
    finixSessionKey,
    isFinixReady,
    refreshSessionKey,
  };
};
