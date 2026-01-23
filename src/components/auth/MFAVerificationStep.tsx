import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Shield, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatPhoneForDisplay, formatPhoneForStorage, validatePhoneNumber, normalizePhoneInput } from '@/lib/phoneUtils';

interface MFAVerificationStepProps {
  defaultEmail: string;
  defaultPhone: string;
  onVerificationComplete: () => void;
  onBack: () => void;
  isLoading?: boolean;
  onMethodChange?: (method: 'email' | 'sms') => void;
}

type VerificationMethod = 'email' | 'sms';
type VerificationStage = 'setup' | 'verify';

export const MFAVerificationStep: React.FC<MFAVerificationStepProps> = ({
  defaultEmail,
  defaultPhone,
  onVerificationComplete,
  onBack,
  isLoading = false,
  onMethodChange
}) => {
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('email');
  const [verificationStage, setVerificationStage] = useState<VerificationStage>('setup');
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(formatPhoneForDisplay(defaultPhone));
  const [verificationCode, setVerificationCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Scroll to top utility function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendCode = async () => {
    setError(null);
    setIsSending(true);
    console.log('handleSendCode called, verificationMethod:', verificationMethod);

    try {
      let identifier: string;
      
      if (verificationMethod === 'email') {
        identifier = email.toLowerCase().trim();
        // Basic email validation
        if (!identifier.includes('@') || identifier.length < 5) {
          throw new Error('Please enter a valid email address');
        }
      } else {
        const phoneValidation = validatePhoneNumber(phone);
        if (!phoneValidation.isValid) {
          throw new Error(phoneValidation.error || 'Invalid phone number');
        }
        // Ensure E.164 format
        identifier = formatPhoneForStorage(phone);
      }

      console.log('Sending OTP via Supabase Native Auth to:', identifier);

      const { data, error } = await supabase.auth.signInWithOtp({
        [verificationMethod === 'email' ? 'email' : 'phone']: identifier,
        options: {
          shouldCreateUser: true, // Allow creating account for signup flow
          // For email, this might trigger a magic link if not configured strictly for OTP, 
          // but Supabase usually handles OTP if requested.
        }
      });

      if (error) {
        console.error('Supabase Auth Error:', error);
        throw error;
      }

      console.log('Supabase response:', data);

      toast({
        title: "Code Sent",
        description: `Verification code sent to your ${verificationMethod === 'email' ? 'email' : 'phone'}.`
      });

      setVerificationStage('verify');
      setResendCooldown(60); // 60 second cooldown
      setAttemptCount(prev => prev + 1);
      scrollToTop();
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      let errorMessage = error.message || 'Failed to send verification code';
      
      if (error.message?.includes('rate limit')) {
        errorMessage = "Too many attempts. Please try again later.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);

    try {
      let identifier: string;
      const type = verificationMethod === 'email' ? 'email' : 'sms';

      if (verificationMethod === 'email') {
        identifier = email.toLowerCase().trim();
      } else {
        identifier = formatPhoneForStorage(phone);
      }

      console.log('Verifying OTP via Supabase Native Auth for:', identifier);

      const { data, error } = await supabase.auth.verifyOtp({
        [verificationMethod === 'email' ? 'email' : 'phone']: identifier,
        token: verificationCode,
        type: type as any // Cast to satisfy type checker if needed
      });

      if (error) {
        console.error('Supabase Verify Error:', error);
        throw error;
      }

      console.log('Verification successful:', data);

      toast({
        title: "Verification Successful",
        description: "Your identity has been verified successfully."
      });

      // Pass the session/user data up if needed, or just signal completion
      onVerificationComplete(); 
    } catch (error: any) {
      console.error('Error verifying code:', error);
      const errorMessage = error.message || 'Failed to verify code';
      
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive"
      });

      // Clear the code on error
      setVerificationCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = () => {
    if (resendCooldown === 0) {
      handleSendCode();
    }
  };

  const handleBackToSetup = () => {
    setVerificationStage('setup');
    setVerificationCode('');
    scrollToTop();
  };

  const handlePhoneChange = (value: string) => {
    const formattedPhone = normalizePhoneInput(value);
    setPhone(formattedPhone);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Multi-Factor Authentication
        </h3>
        <p className="text-muted-foreground">
          {verificationStage === 'setup' 
            ? 'Choose how you\'d like to receive your verification code'
            : 'Enter the 6-digit code we sent to verify your identity'
          }
        </p>
      </div>

      {verificationStage === 'setup' ? (
        <div className="space-y-6">
          {/* Method Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Verification Method</Label>
            <Tabs 
              value={verificationMethod} 
              onValueChange={(value) => {
                const method = value as VerificationMethod;
                setVerificationMethod(method);
                onMethodChange?.(method);
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" disabled={isLoading || isSending}>Email</TabsTrigger>
                <TabsTrigger value="sms" disabled={isLoading || isSending}>SMS</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Contact Information</h4>
            
            {verificationMethod === 'email' ? (
              <div className="space-y-2">
                <Label htmlFor="verification-email">Email Address</Label>
                <Input
                  id="verification-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="h-11"
                  disabled={isLoading || isSending}
                />
                <p className="text-xs text-muted-foreground">
                  We'll send a 6-digit code to this email address
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="verification-phone">Phone Number</Label>
                <Input
                  id="verification-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="h-11"
                  disabled={isLoading || isSending}
                />
                <p className="text-xs text-muted-foreground">
                  We'll send a 6-digit code via SMS to this number
                </p>
              </div>
            )}
          </div>


          {/* Send Code Button */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1"
              disabled={isSending || isLoading}
            >
              Back
            </Button>
            
            <Button
              onClick={handleSendCode}
              className="flex-1"
              disabled={isSending || isLoading}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                `Send Code via ${verificationMethod === 'email' ? 'Email' : 'SMS'}`
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          {/* OTP Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Verification Code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  disabled={isVerifying || isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code sent to your {verificationMethod === 'email' ? 'email' : 'phone'}
              </p>
            </div>

          </div>

          {/* Resend Code */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Didn't receive the code?
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendCode}
              disabled={resendCooldown > 0 || isSending || isVerifying || isLoading}
              className="text-primary hover:text-primary/80"
            >
              {resendCooldown > 0 ? (
                <>
                  <Clock className="h-4 w-4 mr-1" />
                  Resend in {resendCooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Resend Code
                </>
              )}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handleBackToSetup}
              className="flex-1"
              disabled={isVerifying || isLoading}
            >
              Change Method
            </Button>
            
            <Button
              onClick={handleVerifyCode}
              className="flex-1"
              disabled={isVerifying || verificationCode.length !== 6 || isLoading}
            >
              {isVerifying || isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isLoading ? 'Creating Account...' : 'Verifying...'}
                </>
              ) : (
                'Verify Code'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};