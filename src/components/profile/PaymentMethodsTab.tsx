import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Plus, Trash2, Star, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type PaymentMethod = Tables<'payment_methods'>;

export const PaymentMethodsTab = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPaymentMethods();
    }
  }, [user]);

  const loadPaymentMethods = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_payment_methods', {
        p_account_type: profile?.account_type || 'resident'
      });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast({
        title: "Error",
        description: "Failed to load payment methods. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      const { error } = await supabase.rpc('set_default_payment_method', {
        p_id: paymentMethodId,
        p_account_type: profile?.account_type || 'resident'
      });

      if (error) throw error;

      toast({
        title: "Default payment method updated",
        description: "Your default payment method has been updated.",
      });

      loadPaymentMethods();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast({
        title: "Error",
        description: "Failed to update default payment method. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
      const { error } = await supabase.rpc('delete_payment_method', {
        p_id: paymentMethodId
      });

      if (error) throw error;

      toast({
        title: "Payment method deleted",
        description: "Your payment method has been deleted successfully.",
      });

      loadPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment method. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getCardIcon = (methodType: string, cardBrand?: string) => {
    if (methodType === 'ach') {
      return <Building className="h-5 w-5 text-primary" />;
    }
    return <CreditCard className="h-5 w-5 text-primary" />;
  };

  const getMethodDisplayName = (method: PaymentMethod) => {
    if (method.method_type === 'ach') {
      return `Bank Account •••• ${method.last_four}`;
    }
    
    const brand = method.card_brand ? method.card_brand.charAt(0).toUpperCase() + method.card_brand.slice(1) : 'Card';
    return `${brand} •••• ${method.last_four}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Methods
            </CardTitle>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">No payment methods added</p>
              <p className="text-sm text-slate-500 mb-4">
                Add a payment method to make payments easier
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <Card key={method.id} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          {getCardIcon(method.method_type, method.card_brand || undefined)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-slate-800">
                              {getMethodDisplayName(method)}
                            </h4>
                            {method.is_default && (
                              <Badge variant="default" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          {method.method_type === 'card' && method.expires_at && (
                            <p className="text-sm text-slate-500">
                              Expires {new Date(method.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!method.is_default && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetDefault(method.id)}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeletePaymentMethod(method.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {paymentMethods.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">
              Payment Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Secure Payment Processing</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    All payment methods are encrypted and processed securely. We never store your full card numbers.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
              <div>
                <h5 className="font-medium text-slate-800 mb-2">Accepted Payment Types</h5>
                <ul className="space-y-1">
                  <li>• Credit Cards (Visa, Mastercard, American Express)</li>
                  <li>• Debit Cards</li>
                  <li>• Bank Accounts (ACH)</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-slate-800 mb-2">Security Features</h5>
                <ul className="space-y-1">
                  <li>• 256-bit SSL encryption</li>
                  <li>• PCI DSS compliant</li>
                  <li>• Fraud monitoring</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};