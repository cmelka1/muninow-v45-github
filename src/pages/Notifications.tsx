import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, UserNotification } from '@/hooks/useNotifications';
import { Bell, Search, MessageCircle, DollarSign, AlertCircle, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

const Notifications = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [notificationTypeFilter, setNotificationTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [user, authLoading, navigate]);

  const handleNotificationClick = (notification: UserNotification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  // Filter notifications based on search and filters
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = notificationTypeFilter === 'all' || notification.notification_type === notificationTypeFilter;
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'unread' && !notification.is_read) ||
                         (statusFilter === 'read' && notification.is_read);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getNotificationIcon = (notification: UserNotification) => {
    if (notification.notification_type === 'payment_confirmation') {
      return <DollarSign className="h-5 w-5 text-green-600" />;
    }
    
    if (notification.update_type === 'communication') {
      return <MessageCircle className="h-5 w-5 text-blue-600" />;
    }
    
    if (notification.update_type === 'status_change') {
      if (notification.status_change_to === 'approved' || notification.status_change_to === 'issued') {
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      }
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
    
    return <Bell className="h-5 w-5 text-slate-600" />;
  };

  const getServiceContext = (notification: UserNotification) => {
    if (notification.service_number) {
      const serviceType = notification.service_type;
      switch (serviceType) {
        case 'permit':
          return `Permit #${notification.service_number}`;
        case 'business_license':
          return `License #${notification.service_number}`;
        case 'service_application':
          return `Application #${notification.service_number}`;
        default:
          return notification.service_number;
      }
    }
    return null;
  };

  const formatNotificationMessage = (notification: UserNotification) => {
    // For communication notifications, show commenter and message
    if (notification.update_type === 'communication' && notification.communication_details) {
      return {
        commenter: {
          name: notification.communication_details.commenter_name,
          role: notification.communication_details.commenter_role
        },
        message: notification.communication_details.comment_text
      };
    }
    
    return { message: notification.message };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Notifications | MuniNow</title>
      </Helmet>
      <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Notifications
            </h1>
            <p className="text-gray-600">
              Stay updated with all your service updates and payment confirmations
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={notificationTypeFilter} onValueChange={setNotificationTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="service_update">Service Updates</SelectItem>
                <SelectItem value="payment_confirmation">Payment Confirmations</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
              <p className="text-gray-600">
                {searchTerm || notificationTypeFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Try adjusting your filters to see more notifications.'
                  : 'You\'ll see notifications here when you have updates on your services or payments.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const serviceContext = getServiceContext(notification);
            const formattedMessage = formatNotificationMessage(notification);
            
            return (
              <Card 
                key={notification.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !notification.is_read ? 'border-l-4 border-l-primary bg-blue-50/30' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className={`font-semibold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </h3>
                            {!notification.is_read && (
                              <Badge variant="default" className="text-xs">New</Badge>
                            )}
                            {serviceContext && (
                              <Badge variant="outline" className="text-xs">
                                {serviceContext}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Rich message content */}
                          <div className="space-y-3">
                            {formattedMessage.commenter ? (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <MessageCircle className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-slate-900">
                                    {formattedMessage.commenter.name}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {formattedMessage.commenter.role}
                                  </Badge>
                                </div>
                                <p className="text-slate-700">{formattedMessage.message}</p>
                              </div>
                            ) : (
                              <p className="text-gray-600">{formattedMessage.message}</p>
                            )}
                            
                            {/* Status change indicator */}
                            {notification.status_change_from && notification.status_change_to && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="bg-gray-100 px-2 py-1 rounded">
                                  {notification.status_change_from}
                                </span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                  {notification.status_change_to}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatDate(notification.created_at)}
                          </div>
                          {notification.action_url && (
                            <Button variant="ghost" size="sm" className="text-xs">
                              View Details <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      </div>
    </>
  );
};

export default Notifications;