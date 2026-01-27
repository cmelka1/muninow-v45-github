import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/contexts/SimpleAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PreloginHeader } from '@/components/layout/PreloginHeader';
import { PreloginFooter } from '@/components/layout/PreloginFooter';
import { MFAVerificationStep } from '@/components/auth/MFAVerificationStep';
import { Eye, EyeOff, Check, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhoneInput } from '@/lib/phoneUtils';
import { toast } from '@/hooks/use-toast';

interface InvitationData {
  invitation_id: string;
  customer_id: string;
  customer_name: string;
  invitation_email: string;
  role: string;
  is_valid: boolean;
  error_message: string | null;
}

const MunicipalSignup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const invitationToken = searchParams.get('invitation');

  // Invitation state
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = normalizePhoneInput(e.target.value);
    setPhone(formatted);
  };

  // Validate invitation token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!invitationToken) {
        setIsValidating(false);
        setValidationError('No invitation token provided. Please use the link from your invitation email.');
        return;
      }

      try {
        // Call the validate RPC (cast to any temporarily until types are regenerated)
        const { data, error } = await (supabase.rpc as any)('validate_municipal_invitation', {
          p_token: invitationToken
        });

        if (error) {
          setValidationError('Unable to validate invitation. Please try again or contact support.');
          return;
        }

        const result = data?.[0];
        if (!result?.is_valid) {
          setValidationError(result?.error_message || 'Invalid or expired invitation.');
          return;
        }

        setInvitationData({
          invitation_id: result.invitation_id,
          customer_id: result.customer_id,
          customer_name: result.customer_name,
          invitation_email: result.invitation_email,
          role: result.role,
          is_valid: true,
          error_message: null
        });
      } catch (err) {
        setValidationError('An error occurred while validating your invitation.');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [invitationToken]);

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      navigate('/municipal/dashboard');
    }
  }, [user, navigate]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitationData) {
      toast({
        title: "Error",
        description: "Invalid invitation data.",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match.",
        variant: "destructive"
      });
      return;
    }

    if (!termsAccepted) {
      toast({
        title: "Error",
        description: "You must accept the terms and conditions.",
        variant: "destructive"
      });
      return;
    }

    if (!marketingConsent) {
      toast({
        title: "Error",
        description: "Marketing consent is required.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Move to MFA step (email-only verification)
      setCurrentStep(2);
      scrollToTop();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completeMunicipalSignup = async () => {
    if (!invitationData || !invitationToken) return;
    
    setIsCreatingAccount(true);

    try {
      // Create Supabase auth account - email from invitation (locked)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitationData.invitation_email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/municipal/dashboard`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            account_type: invitationData.role === 'admin' ? 'municipaladmin' : 'municipaluser',
            role: invitationData.role,
            customer_id: invitationData.customer_id,
            invitation_token: invitationToken
          },
        }
      });

      if (authError) {
        throw new Error(`Account creation failed: ${authError.message}`);
      }

      // Accept the invitation to update profile and team_members
      if (authData.user) {
        const { error: acceptError } = await (supabase.rpc as any)('accept_municipal_invitation', {
          p_invitation_token: invitationToken,
          p_user_id: authData.user.id
        });

        if (acceptError) {
          console.error('Error accepting invitation:', acceptError);
          // Don't throw - account is created, just log the error
        }
      }

      toast({
        title: "Account Created Successfully!",
        description: "Your municipal account has been created. Please check your email to verify.",
      });

      setCurrentStep(3);
      scrollToTop();
    } catch (error) {
      toast({
        title: "Account Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create account.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      scrollToTop();
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="flex flex-col min-h-screen">
        <PreloginHeader />
        <main className="flex-1 gradient-bg flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Validating your invitation...</p>
            </CardContent>
          </Card>
        </main>
        <PreloginFooter />
      </div>
    );
  }

  // Error state - no token or invalid token
  if (validationError || !invitationData) {
    return (
      <div className="flex flex-col min-h-screen">
        <PreloginHeader />
        <main className="flex-1 gradient-bg flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-xl">Invitation Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                {validationError || 'A valid invitation is required to create a municipal account.'}
              </p>
              <p className="text-sm text-muted-foreground">
                If you believe you should have access, please contact your organization administrator or MuniNow support.
              </p>
              <Button variant="outline" onClick={() => navigate('/signin')} className="w-full">
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
        </main>
        <PreloginFooter />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Sign Up | MuniNow</title>
      </Helmet>
      <div className="flex flex-col min-h-screen">
      <PreloginHeader />
      <main className="flex-1 gradient-bg flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card className="signin-card card-entrance border-0 bg-card/95">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold gradient-text mb-2">
                Municipal Signup
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base">
                Complete your account for <span className="font-medium text-foreground">{invitationData.customer_name}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              {/* Progress Indicator */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>Step {currentStep} of 3</span>
                  <span>
                    {currentStep === 1 && "Information"}
                    {currentStep === 2 && "Email Verification"}
                    {currentStep === 3 && "Complete"}
                  </span>
                </div>
                <Progress value={(currentStep / 3) * 100} className="h-2" />
              </div>

              {/* Step 1: Form Collection */}
              {currentStep === 1 && (
                <>
                  <form onSubmit={handleFormSubmit} className="space-y-5">
                    {/* Municipality - Locked */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Municipality
                      </Label>
                      <div className="h-11 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
                        <span className="text-foreground">{invitationData.customer_name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">(from invitation)</span>
                      </div>
                    </div>

                    {/* Email - Locked */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Email
                      </Label>
                      <div className="h-11 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
                        <span className="text-foreground">{invitationData.invitation_email}</span>
                        <span className="ml-2 text-xs text-muted-foreground">(from invitation)</span>
                      </div>
                    </div>

                    {/* Role - Display only */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Role
                      </Label>
                      <div className="h-11 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
                        <span className="text-foreground capitalize">
                          {invitationData.role === 'admin' ? 'Municipal Admin' : 'Municipal User'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                          First Name *
                        </Label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                          Last Name *
                        </Label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                        Phone Number *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChange={handlePhoneChange}
                        required
                        className="h-11"
                        maxLength={14}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-foreground">
                        Password *
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a secure password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                        Confirm Password *
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Terms and Notifications */}
                    <div className="space-y-3">
                      <div className="flex flex-row items-start space-x-3 space-y-0">
                        <Checkbox
                          checked={termsAccepted}
                          onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                          className="mt-1"
                        />
                        <div className="space-y-1 leading-none">
                          <Label className="cursor-pointer text-sm">
                            I agree to the{' '}
                            <Link to="/terms" className="text-primary hover:underline">
                              terms of service
                            </Link>
                            {' '}and{' '}
                            <Link to="/privacy" className="text-primary hover:underline">
                              privacy policy
                            </Link>
                          </Label>
                        </div>
                      </div>

                      <div className="flex flex-row items-start space-x-3 space-y-0">
                        <Checkbox
                          checked={marketingConsent}
                          onCheckedChange={(checked) => setMarketingConsent(checked as boolean)}
                          className="mt-1"
                        />
                        <div className="space-y-1 leading-none">
                          <Label className="cursor-pointer text-sm">
                            I agree to receive notifications and messages from MuniNow
                          </Label>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-colors"
                    >
                      {isLoading ? 'Validating...' : 'Continue to Email Verification'}
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/signin')}
                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Sign in here
                      </button>
                    </p>
                  </div>
                </>
              )}

              {/* Step 2: MFA Verification - Email Only */}
              {currentStep === 2 && (
                <MFAVerificationStep
                  defaultEmail={invitationData.invitation_email}
                  defaultPhone={phone}
                  onVerificationComplete={completeMunicipalSignup}
                  onBack={goBack}
                  isLoading={isCreatingAccount}
                  emailOnly={true}
                  lockedEmail={true}
                />
              )}

              {/* Step 3: Success */}
              {currentStep === 3 && (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      Account Created Successfully!
                    </h3>
                    <p className="text-muted-foreground">
                      Your municipal account has been created for{' '}
                      <span className="font-medium text-foreground">
                        {invitationData.customer_name}
                      </span>.
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 text-left">
                     <p className="font-semibold text-amber-800 flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        Action Required: Confirm Email
                     </p>
                     <p className="text-sm text-amber-700">
                        We have sent a confirmation link to <strong>{invitationData.invitation_email}</strong>. You MUST click that link before you can log in.
                     </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>Next steps:</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 text-left">
                      <li>• <strong>Check your email to verify your account</strong></li>
                      <li>• Complete your payment setup</li>
                      <li>• Configure your municipality settings</li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => navigate('/municipal/dashboard')}
                    className="w-full h-11"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <PreloginFooter />
    </div>
    </>
  );
};

export default MunicipalSignup;