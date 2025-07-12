import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PreloginHeader } from '@/components/layout/PreloginHeader';
import { PreloginFooter } from '@/components/layout/PreloginFooter';
import { supabase } from '@/integrations/supabase/client';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      navigate('/municipal/dashboard');
    }
  }, [user, navigate]);

  // Load customers for dropdown
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('customer_id, legal_entity_name, doing_business_as, business_city, business_state')
          .order('legal_entity_name');

        if (error) throw error;
        setCustomers(data || []);
      } catch (error) {
        console.error('Error loading customers:', error);
        toast({
          title: "Error",
          description: "Failed to load municipalities. Please refresh the page.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    loadCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomerId) {
      toast({
        title: "Error",
        description: "Please select a municipality.",
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

      // TODO: Implement municipal signup logic
      // This is a placeholder for the actual signup implementation
      toast({
        title: "Coming Soon",
        description: "Municipal signup functionality will be implemented in the next step.",
        variant: "default"
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during signup.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomerDisplayName = (customer: Customer) => {
    return `${customer.legal_entity_name} - ${customer.business_city}, ${customer.business_state}`;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <PreloginHeader />
      <main className="flex-1 gradient-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="signin-card card-entrance border-0 bg-card/95">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold gradient-text mb-1">
                Municipal Signup
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base">
                Create an administrator account for your municipality.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="municipality" className="text-sm font-medium text-foreground">
                    Municipality *
                  </Label>
                  <Select 
                    value={selectedCustomerId} 
                    onValueChange={setSelectedCustomerId}
                    disabled={isLoadingCustomers}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={isLoadingCustomers ? "Loading municipalities..." : "Select your municipality"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {customers.map((customer) => (
                        <SelectItem key={customer.customer_id} value={customer.customer_id}>
                          {getCustomerDisplayName(customer)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading || isLoadingCustomers}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-colors"
                >
                  {isLoading ? 'Creating Account...' : 'Create Municipal Account'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/auth')}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <PreloginFooter />
    </div>
  );
};

export default MunicipalSignup;