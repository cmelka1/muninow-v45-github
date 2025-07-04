import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, MessageSquare, Shield, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type VerificationType = 'email' | 'sms';

interface MFAVerificationStepProps {
  formData: any;
  onBack: () => void;
  onVerificationComplete: () => void;
  isCreatingAccount: boolean;
}

export const MFAVerificationStep: React.FC<MFAVerificationStepProps> = ({
  formData,
  onBack,
  onVerificationComplete,
  isCreatingAccount
}) => {
  const [step, setStep] = useState<'selection' | 'verification'>('selection');
  const [verificationType, setVerificationType] = useState<VerificationType>('email');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationSent, setVerificationSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(formData?.mobileNumber || '');
  const [customEmail, setCustomEmail] = useState(formData?.email || '');

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendVerificationCode = async () => {
    setIsSending(true);
    try {
      const identifier = verificationType === 'email' ? customEmail : phoneNumber;
      
      const { data } = await supabase.functions.invoke('send-verification', {
        body: {
          identifier,
          type: verificationType,
          action: 'send'
        }
      });

      if (data?.success) {
        toast({
          title: "Verification code sent",
          description: `Please check your ${verificationType === 'email' ? 'email' : 'text messages'} for the verification code.`
        });
        setVerificationSent(true);
        setStep('verification');
        setResendCooldown(60);
      } else {
        throw new Error(data?.error || 'Failed to send verification code');
      }
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the complete 6-digit code.",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);
    try {
      const identifier = verificationType === 'email' ? customEmail : phoneNumber;
      
      const { data } = await supabase.functions.invoke('send-verification', {
        body: {
          identifier,
          type: verificationType,
          action: 'verify',
          code
        }
      });

      if (data?.success) {
        toast({
          title: "Verification successful",
          description: "Your identity has been verified successfully."
        });
        onVerificationComplete();
      } else {
        throw new Error(data?.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent pasting long strings
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      setTimeout(() => verifyCode(), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatPhoneInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 
      ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
      : local;
    return `${maskedLocal}@${domain}`;
  };

  const maskPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ***-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (step === 'selection') {
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
            Choose how you'd like to receive your verification code for enhanced security
          </p>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-medium">Verification Method</Label>
          
          <Tabs value={verificationType} onValueChange={(value) => setVerificationType(value as VerificationType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Text
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-3">
            {verificationType === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="h-11"
                />
              </div>
            )}

            {verificationType === 'sms' && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(formatPhoneInput(e.target.value))}
                  placeholder="(555) 123-4567"
                  className="h-11"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1"
            disabled={isSending}
          >
            Back
          </Button>
          
          <Button
            onClick={sendVerificationCode}
            className="flex-1"
            disabled={isSending || (verificationType === 'sms' && !phoneNumber) || (verificationType === 'email' && !customEmail)}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              `Send ${verificationType === 'email' ? 'Email' : 'SMS'} Code`
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          {verificationType === 'email' ? (
            <Mail className="h-8 w-8 text-primary" />
          ) : (
            <MessageSquare className="h-8 w-8 text-primary" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Enter Verification Code
        </h3>
        <p className="text-muted-foreground">
          We've sent a 6-digit code to{' '}
          {verificationType === 'email' 
            ? maskEmail(customEmail)
            : maskPhone(phoneNumber)
          }
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-center space-x-2">
          {verificationCode.map((digit, index) => (
            <Input
              key={index}
              id={`code-${index}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-lg font-mono"
              autoComplete="off"
            />
          ))}
        </div>

        <div className="text-center">
          <Button
            variant="link"
            onClick={sendVerificationCode}
            disabled={resendCooldown > 0 || isSending}
            className="text-sm"
          >
            {resendCooldown > 0 ? (
              `Resend code in ${resendCooldown}s`
            ) : isSending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Sending...
              </>
            ) : (
              'Resend code'
            )}
          </Button>
        </div>

        <div className="bg-muted/20 p-4 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Didn't receive the code?</p>
              <ul className="space-y-1 text-xs">
                <li>• Check your spam/junk folder</li>
                <li>• Ensure your {verificationType === 'email' ? 'email' : 'phone'} is correct</li>
                <li>• Wait a few minutes for delivery</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => setStep('selection')}
          className="flex-1"
          disabled={isVerifying || isCreatingAccount}
        >
          Change Method
        </Button>
        
        <Button
          onClick={verifyCode}
          className="flex-1"
          disabled={isVerifying || isCreatingAccount || verificationCode.some(digit => !digit)}
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Verifying...
            </>
          ) : isCreatingAccount ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creating Account...
            </>
          ) : (
            'Verify & Continue'
          )}
        </Button>
      </div>
    </div>
  );
};