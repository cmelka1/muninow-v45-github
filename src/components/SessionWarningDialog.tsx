import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SessionWarningDialogProps {
  isOpen: boolean;
  onExtendSession: () => void;
  onSignOut: () => void;
  warningSeconds?: number;
}

export const SessionWarningDialog: React.FC<SessionWarningDialogProps> = ({
  isOpen,
  onExtendSession,
  onSignOut,
  warningSeconds = 60
}) => {
  const [countdown, setCountdown] = useState(warningSeconds);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(warningSeconds);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onSignOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, warningSeconds, onSignOut]);

  const handleExtendSession = () => {
    setCountdown(warningSeconds);
    onExtendSession();
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            ⏰ Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Your session will expire due to inactivity.</p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-sm font-medium text-destructive">
                Time remaining: <span className="font-mono text-lg">{countdown}s</span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Click "Stay Signed In" to extend your session, or you'll be automatically signed out for security.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onSignOut} className="w-full sm:w-auto">
            Sign Out Now
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleExtendSession} className="w-full sm:w-auto">
            Stay Signed In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};