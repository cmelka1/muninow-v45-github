import { Bell, MessageCircle, DollarSign, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useNotifications, UserNotification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: UserNotification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  const handleOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const getNotificationIcon = (notification: UserNotification) => {
    if (notification.notification_type === 'payment_confirmation') {
      return <DollarSign className="h-4 w-4 text-green-600" />;
    }
    
    if (notification.update_type === 'communication') {
      return <MessageCircle className="h-4 w-4 text-blue-600" />;
    }
    
    if (notification.update_type === 'status_change') {
      return <AlertCircle className="h-4 w-4 text-orange-600" />;
    }
    
    return <Bell className="h-4 w-4 text-slate-600" />;
  };

  const formatNotificationMessage = (notification: UserNotification) => {
    // For communication notifications, show commenter name and truncated message
    if (notification.update_type === 'communication' && notification.communication_details) {
      const commenterName = notification.communication_details.commenter_name;
      const commenterRole = notification.communication_details.commenter_role;
      const commentText = notification.communication_details.comment_text;
      
      // Truncate comment for dropdown display
      const truncatedComment = commentText.length > 100 
        ? commentText.substring(0, 100) + '...' 
        : commentText;
      
      return `${commenterName} (${commenterRole}): ${truncatedComment}`;
    }
    
    return notification.message;
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

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="p-3">
          <span className="font-semibold">Notifications</span>
        </div>
        <DropdownMenuSeparator />
        
        {recentNotifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            {recentNotifications.map((notification) => {
              const serviceContext = getServiceContext(notification);
              
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start p-3 cursor-pointer hover:bg-slate-50"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </span>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                        </div>
                        
                        {serviceContext && (
                          <p className="text-xs text-blue-600 font-medium mt-1">
                            {serviceContext}
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                          {formatNotificationMessage(notification)}
                        </p>
                        
                        <span className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </ScrollArea>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-center justify-center"
          onClick={() => navigate('/notifications')}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}