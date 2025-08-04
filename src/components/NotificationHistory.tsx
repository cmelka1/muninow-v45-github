import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MessageSquare, Users, UserCheck, Clock, CheckCircle, XCircle, Bell } from "lucide-react";

interface Notification {
  id: string;
  notification_type: string;
  delivery_method: string;
  message_subject?: string;
  message_body?: string;
  visit_notes?: string;
  municipal_employee_name?: string;
  delivery_status: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

interface NotificationHistoryProps {
  billId: string;
}

export function NotificationHistory({ billId }: NotificationHistoryProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [billId]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('bill_notifications')
        .select('*')
        .eq('bill_id', billId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDeliveryMethodIcon = (method: string) => {
    switch (method) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'both':
        return <Users className="h-4 w-4" />;
      case 'in_person_visit':
        return <UserCheck className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'manual':
        return 'Manual';
      case 'issued':
        return 'Bill Issued';
      case 'overdue':
        return 'Overdue';
      case 'delinquent':
        return 'Delinquent';
      default:
        return type;
    }
  };

  const getDeliveryMethodLabel = (method: string) => {
    switch (method) {
      case 'email':
        return 'Email';
      case 'sms':
        return 'SMS';
      case 'both':
        return 'Email & SMS';
      case 'in_person_visit':
        return 'In-Person Visit';
      default:
        return method;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notification History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notification History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center text-muted-foreground">
            No notifications sent yet
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex items-center space-x-2">
                    {getDeliveryMethodIcon(notification.delivery_method)}
                    {getStatusIcon(notification.delivery_status)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {getNotificationTypeLabel(notification.notification_type)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {getDeliveryMethodLabel(notification.delivery_method)}
                      </span>
                    </div>
                    
                    {notification.municipal_employee_name && (
                      <div className="text-sm text-muted-foreground">
                        Sent by: {notification.municipal_employee_name}
                      </div>
                    )}
                    
                    {notification.message_subject && (
                      <div className="text-sm font-medium">
                        {notification.message_subject}
                      </div>
                    )}
                    
                    {notification.message_body && (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message_body}
                      </div>
                    )}
                    
                    {notification.visit_notes && (
                      <div className="text-sm text-muted-foreground">
                        <strong>Visit Notes:</strong> {notification.visit_notes}
                      </div>
                    )}
                    
                    {notification.error_message && (
                      <div className="text-sm text-red-600">
                        Error: {notification.error_message}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground text-right">
                  <div>
                    {notification.sent_at ? formatDate(notification.sent_at) : formatDate(notification.created_at)}
                  </div>
                  {notification.delivery_status && (
                    <Badge 
                      variant={
                        notification.delivery_status === 'sent' || notification.delivery_status === 'completed'
                          ? 'default'
                          : notification.delivery_status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="mt-1"
                    >
                      {notification.delivery_status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}