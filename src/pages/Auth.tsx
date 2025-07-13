
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { PreloginHeader } from '@/components/layout/PreloginHeader';
import { PreloginFooter } from '@/components/layout/PreloginFooter';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  
  const { 
    user, 
    isSubmitting, 
    loginError, 
    signIn, 
    setForgotPasswordOpen,
    clearError 
  } = useAuth();

  // Let AuthContext handle navigation - no redirects here

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const { error } = await signIn(email, password);

    if (!error) {
      // Navigation will be handled by the auth context effect
    }
  };

  const handleForgotPassword = () => {
    setForgotPasswordOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <PreloginHeader />
      <main className="flex-1 gradient-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="signin-card card-entrance border-0 bg-card/95">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold gradient-text mb-1">
                Sign In
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base">
                Welcome back! Please enter your details.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleAuth} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 focus:ring-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 focus:ring-primary pr-10"
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label 
                      htmlFor="remember" 
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Remember Me
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {loginError && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{loginError}</p>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-colors"
                >
                  {isSubmitting ? 'Loading...' : 'Sign In'}
                </Button>
              </form>
              
              <div className="mt-6 space-y-4">
                
                <div className="text-center">
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="w-full group hover:bg-primary/5 transition-colors"
                  >
                    <Link to="/signup">
                      Create Account
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <ForgotPasswordDialog />
      </main>
      <PreloginFooter />
    </div>
  );
};

export default Auth;
