import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { Mail, ArrowLeft } from 'lucide-react';



interface ForgotPasswordDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({ 
  open = false, 
  onOpenChange 
}) => {
  const { 
    resetPassword, 
    error
  } = useAuth();
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);


  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setEmailError('');
    
    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    const { error } = await resetPassword(email);
    
    if (!error) {
      setResetSent(true);
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
    setEmail('');
    setEmailError('');
    setResetSent(false);
  };

  const handleBackToLogin = () => {
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-0 bg-card/95 backdrop-blur-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold gradient-text">
            Reset Password
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {resetSent 
              ? "We've sent you a password reset link" 
              : "Enter your email to receive a password reset link"
            }
          </DialogDescription>
        </DialogHeader>

        {resetSent ? (
          <div className="space-y-4 text-center py-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground">
                We've sent password reset instructions to your email address.
              </p>
            </div>
            <Button
              onClick={handleBackToLogin}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                className="h-11"
                disabled={isSubmitting}
                autoFocus
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}



            <div className="space-y-3">
              <Button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full h-11"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackToLogin}
                className="w-full"
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};