import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MunicipalityAutocomplete } from '@/components/ui/municipality-autocomplete';
import { PreloginHeader } from '@/components/layout/PreloginHeader';
import { PreloginFooter } from '@/components/layout/PreloginFooter';
import { MFAVerificationStep } from '@/components/auth/MFAVerificationStep';
import { Eye, EyeOff, Check, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhoneInput } from '@/lib/phoneUtils';
import { toast } from '@/hooks/use-toast';

interface Customer {
  customer_id: string;
  legal_entity_name: string;
  doing_business_as: string;
  business_city: string;
  business_state: string;
}

const MunicipalSignup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Scroll to top utility function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = normalizePhoneInput(e.target.value);
    setPhone(formatted);
  };

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      navigate('/municipal/dashboard');
    }
  }, [user, navigate]);


  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomerId) {
      toast({
        title: "Error",
        description: "Please select a municipality.",
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
      // Check if customer already has an admin
      const { data: hasAdmin } = await supabase
        .rpc('check_customer_admin_exists', { p_customer_id: selectedCustomerId });

      if (hasAdmin) {
        toast({
          title: "Error",
          description: "This municipality already has an administrator.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Move to MFA step
      setCurrentStep(2);
      scrollToTop();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during validation.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completeMunicipalSignup = async () => {
    setIsCreatingAccount(true);

    try {
      // Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/municipal/dashboard`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            account_type: 'municipal',
            role: 'admin',
            customer_id: selectedCustomerId
          }
        }
      });

      if (authError) {
        throw new Error(`Account creation failed: ${authError.message}`);
      }

      toast({
        title: "Account Created Successfully!",
        description: "Your municipal administrator account has been created. Please check your email to verify your account.",
      });

      setCurrentStep(3);
      scrollToTop();
    } catch (error: any) {
      toast({
        title: "Account Creation Failed",
        description: error.message || "Failed to create account. Please try again.",
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

  const handleMunicipalitySelect = (municipality: Customer) => {
    setSelectedMunicipality(municipality);
    setSelectedCustomerId(municipality.customer_id);
  };

  return (
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
                Create an administrator account for your municipality.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              {/* Progress Indicator */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>Step {currentStep} of 3</span>
                  <span>
                    {currentStep === 1 && "Information"}
                    {currentStep === 2 && "Security Setup"}
                    {currentStep === 3 && "Complete"}
                  </span>
                </div>
                <Progress value={(currentStep / 3) * 100} className="h-2" />
              </div>

              {/* Step 1: Form Collection */}
              {currentStep === 1 && (
                <>
                  <form onSubmit={handleFormSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="municipality" className="text-sm font-medium text-foreground">
                    Municipality *
                  </Label>
                  <MunicipalityAutocomplete
                    onSelect={handleMunicipalitySelect}
                    placeholder="Search for your municipality..."
                    disabled={isLoading}
                  />
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
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@municipality.gov"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
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
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
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
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
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
                    {isLoading ? 'Validating...' : 'Continue to Security Setup'}
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

              {/* Step 2: MFA Verification */}
              {currentStep === 2 && (
                <MFAVerificationStep
                  defaultEmail={email}
                  defaultPhone={phone}
                  onVerificationComplete={completeMunicipalSignup}
                  onBack={goBack}
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
                      Your municipal administrator account has been created for{' '}
                      <span className="font-medium text-foreground">
                        {selectedMunicipality?.legal_entity_name}
                      </span>.
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>Next steps:</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 text-left">
                      <li>• Check your email to verify your account</li>
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
  );
};

export default MunicipalSignup;