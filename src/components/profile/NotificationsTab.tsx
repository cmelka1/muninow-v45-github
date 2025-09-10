import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, Smartphone, FileText, DollarSign, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NotificationPreferences {
  serviceUpdates: {
    email: boolean;
    sms: boolean;
  };
  paymentConfirmations: {
    email: boolean;
    sms: boolean;
  };
  paperlessBilling: boolean;
}

// Simplified notification categories configuration
const notificationCategories = [
  {
    key: 'serviceUpdates' as const,
    icon: Bell,
    title: 'Service Updates',
    description: 'Status changes, communications, and updates on your services'
  },
  {
    key: 'paymentConfirmations' as const,
    icon: DollarSign,
    title: 'Payment Confirmations',
    description: 'Confirmations when payments are processed'
  }
];

export const NotificationsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Initialize preferences state
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    serviceUpdates: { email: true, sms: false },
    paymentConfirmations: { email: true, sms: false },
    paperlessBilling: false
  });
  const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferences>({
    serviceUpdates: { email: true, sms: false },
    paymentConfirmations: { email: true, sms: false },
    paperlessBilling: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Load user preferences on mount
  useEffect(() => {
    if (!user?.id) return;

    // Fetch user notification preferences
    const fetchPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching preferences:', error);
          return;
        }

        if (data) {
          const fetchedPreferences = {
            serviceUpdates: {
              email: data.email_service_updates ?? true,
              sms: data.sms_service_updates ?? false
            },
            paymentConfirmations: {
              email: data.email_payment_confirmations ?? true,
              sms: data.sms_payment_confirmations ?? false
            },
            paperlessBilling: (data as any).paperless_billing ?? false
          };
          
          setPreferences(fetchedPreferences);
          setOriginalPreferences(fetchedPreferences);
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    fetchPreferences();
  }, [user?.id]);

  // Handle preference changes
  const handlePreferenceChange = (category: 'serviceUpdates' | 'paymentConfirmations', type: 'email' | 'sms', value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [type]: value
      }
    }));
  };

  const handlePaperlessChange = (value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      paperlessBilling: value
    }));
  };

  const handleCancel = () => {
    setPreferences(originalPreferences);
    setIsEditing(false);
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
          email_service_updates: preferences.serviceUpdates.email,
          sms_service_updates: preferences.serviceUpdates.sms,
          email_payment_confirmations: preferences.paymentConfirmations.email,
          sms_payment_confirmations: preferences.paymentConfirmations.sms,
          paperless_billing: preferences.paperlessBilling,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setOriginalPreferences(preferences);
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated successfully.",
      });
      setIsEditing(false);
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notification Preferences
            </CardTitle>
            {!isEditing ? (
              <Button type="button" onClick={() => setIsEditing(true)} variant="outline">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Preferences
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button type="button" onClick={savePreferences} size="sm" disabled={isLoading}>
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button type="button" onClick={handleCancel} variant="outline" size="sm" disabled={isLoading}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Unified interface for all users */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-800">Notification Preferences</h3>
              <p className="text-sm text-slate-600">
                Choose how you'd like to receive notifications for different types of updates.
              </p>
            </div>

            {notificationCategories.map((category) => (
              <div key={category.key} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">{category.title}</h4>
                    <p className="text-sm text-slate-600">{category.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-11">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">Email</span>
                    </div>
                    <Switch
                      checked={preferences[category.key].email}
                      onCheckedChange={(checked) => handlePreferenceChange(category.key, 'email', checked)}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">SMS</span>
                    </div>
                    <Switch
                      checked={preferences[category.key].sms}
                      onCheckedChange={(checked) => handlePreferenceChange(category.key, 'sms', checked)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Paperless Billing Section - Hidden for municipal users */}
      {user && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Billing Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
              <div>
                <h4 className="font-medium text-slate-800">Enable Paperless Billing</h4>
                <p className="text-sm text-slate-600">
                  Receive all bills and statements electronically instead of by mail
                </p>
              </div>
              <Switch
                checked={preferences.paperlessBilling}
                onCheckedChange={handlePaperlessChange}
                disabled={!isEditing}
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
      )}
    </div>
  );
};