import { useEffect, useRef, useCallback } from 'react';

interface UseSessionTimeoutProps {
  timeoutMinutes: number;
  warningMinutes: number;
  onTimeout: () => void;
  onWarning: () => void;
  isAuthenticated: boolean;
}

export const useSessionTimeout = ({
  timeoutMinutes,
  warningMinutes,
  onTimeout,
  onWarning,
  isAuthenticated
}: UseSessionTimeoutProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;

    clearTimers();
    lastActivityRef.current = Date.now();

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

    // Set warning timer
    warningRef.current = setTimeout(() => {
      onWarning();
    }, warningMs);

    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeoutMs);
  }, [timeoutMinutes, warningMinutes, onTimeout, onWarning, isAuthenticated, clearTimers]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Debounce activity detection to prevent excessive timer resets
    if (now - lastActivityRef.current > 1000) {
      resetTimer();
    }
  }, [resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }

    // Start the timer when authenticated
    resetTimer();

    // Activity event listeners
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Use visibilitychange for better window state detection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Don't logout immediately on tab switch - let normal timeout handle it
        return;
      }
      // Reset timer when tab becomes visible again
      handleActivity();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimers();
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, resetTimer, handleActivity, onTimeout, clearTimers]);

  return {
    resetTimer,
    clearTimers
  };
};