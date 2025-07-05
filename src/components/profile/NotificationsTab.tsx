import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, Smartphone, FileText, AlertTriangle, DollarSign, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NotificationPreferences {
  email: {
    billPosting: boolean;
    paymentConfirmations: boolean;
  };
  sms: {
    billPosting: boolean;
    paymentConfirmations: boolean;
  };
  paperlessBilling: boolean;
}

const initialPreferences: NotificationPreferences = {
  email: {
    billPosting: true,
    paymentConfirmations: true,
  },
  sms: {
    billPosting: false,
    paymentConfirmations: false,
  },
  paperlessBilling: false,
};

export const NotificationsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>(initialPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading preferences:', error);
          return;
        }

        if (data) {
          setPreferences({
            email: {
              billPosting: data.email_bill_posting,
              paymentConfirmations: data.email_payment_confirmation,
            },
            sms: {
              billPosting: data.sms_bill_posting,
              paymentConfirmations: data.sms_payment_confirmation,
            },
            paperlessBilling: false, // This could be stored separately if needed
          });
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  const handlePreferenceChange = (
    type: 'email' | 'sms',
    category: keyof NotificationPreferences['email'],
    value: boolean
  ) => {
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [category]: value
      }
    }));
  };

  const handlePaperlessChange = (value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      paperlessBilling: value
    }));
  };

  const savePreferences = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to save preferences.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          email_bill_posting: preferences.email.billPosting,
          sms_bill_posting: preferences.sms.billPosting,
          email_payment_confirmation: preferences.email.paymentConfirmations,
          sms_payment_confirmation: preferences.sms.paymentConfirmations,
        });

      if (error) throw error;
      
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const notificationCategories = [
    {
      key: 'billPosting' as const,
      icon: FileText,
      title: 'Bill Posting',
      description: 'Get notified when new bills are posted to your account',
      userControlled: true,
    },
    {
      key: 'billNotice' as const,
      icon: AlertTriangle,
      title: 'Bill Notice',
      description: 'Past due notices, delinquency notices, and service turn-off warnings',
      userControlled: false,
    },
    {
      key: 'paymentConfirmations' as const,
      icon: DollarSign,
      title: 'Payment Confirmations',
      description: 'Confirmations when payments are processed',
      userControlled: true,
    }
  ];

  if (isLoadingPreferences) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading your notification preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Preferences */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <div key={category.key} className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-primary/10 p-2 rounded-lg mt-1">
                    <IconComponent className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800">{category.title}</h4>
                    <p className="text-sm text-slate-600 mb-3">{category.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {category.userControlled ? (
                        <>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-slate-500" />
                              <Label className="text-sm font-medium">Email</Label>
                            </div>
                            <Switch
                              checked={preferences.email[category.key as keyof NotificationPreferences['email']]}
                              onCheckedChange={(value) => handlePreferenceChange('email', category.key as keyof NotificationPreferences['email'], value)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Smartphone className="h-4 w-4 text-slate-500" />
                              <Label className="text-sm font-medium">SMS</Label>
                            </div>
                            <Switch
                              checked={preferences.sms[category.key as keyof NotificationPreferences['sms']]}
                              onCheckedChange={(value) => handlePreferenceChange('sms', category.key as keyof NotificationPreferences['sms'], value)}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="col-span-full">
                          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Shield className="h-4 w-4 text-amber-600" />
                              <Label className="text-sm font-medium text-amber-900">Municipality Controlled</Label>
                            </div>
                            <div className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                              Always Enabled
                            </div>
                          </div>
                          <p className="text-xs text-amber-600 mt-2">
                            These notifications are controlled by your municipality and will always be sent for account security and compliance.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Paperless Billing */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Paperless Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-800">Enable Paperless Billing</h4>
              <p className="text-sm text-slate-600">
                Receive all bills and statements electronically instead of by mail
              </p>
            </div>
            <Switch
              checked={preferences.paperlessBilling}
              onCheckedChange={handlePaperlessChange}
            />
          </div>
          
          {preferences.paperlessBilling && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Paperless Billing Enabled</h4>
                  <p className="text-sm text-green-700 mt-1">
                    You'll receive all bills and statements via email. Paper statements will no longer be mailed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Information */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">
            Notification Delivery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <Mail className="h-5 w-5 text-primary" />
                <h4 className="font-medium text-slate-800">Email Notifications</h4>
              </div>
              <p className="text-sm text-slate-600 mb-2">
                Delivered to: {user?.email}
              </p>
              <p className="text-xs text-slate-500">
                Email notifications are sent immediately when events occur.
              </p>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <h4 className="font-medium text-slate-800">SMS Notifications</h4>
              </div>
              <p className="text-sm text-slate-600 mb-2">
                Phone number not configured
              </p>
              <p className="text-xs text-slate-500">
                Add a phone number in your profile to receive SMS notifications.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Important Notice</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Critical account notifications (such as delinquency notices) will always be sent regardless of your preferences 
                  to ensure you receive important account information.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={savePreferences}
          disabled={isLoading}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
          )}
          Save Preferences
        </button>
      </div>
    </div>
  );
};