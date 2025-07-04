import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator
} from '@/components/ui/sidebar';
import { Home, Clock, Users, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navigationItems = [
  {
    title: 'Dashboard',
    icon: Home,
    url: '/dashboard'
  },
  {
    title: 'Payment History',
    icon: Clock,
    url: '/payment-history'
  },
  {
    title: 'Members',
    icon: Users,
    url: '/members'
  },
  {
    title: 'Profile',
    icon: User,
    url: '/profile'
  }
];

export function AppSidebar() {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) {
      return user?.email?.charAt(0).toUpperCase() || 'U';
    }
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Sidebar className="w-64 bg-background border-r border-border">
      {/* Header */}
      <SidebarHeader className="px-6 py-8">
        <div className="flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">M</span>
            </div>
            <h1 className="text-xl font-bold text-primary">MuniNow</h1>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-4">
        <SidebarGroup>
          <div className="mb-6">
            <h2 className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide mb-3 px-3">
              MAIN MENU
            </h2>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  const Icon = item.icon;
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) => 
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                              isActive 
                                ? 'bg-primary text-primary-foreground shadow-sm' 
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`
                          }
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </div>
        </SidebarGroup>
      </SidebarContent>

      {/* User Profile Section */}
      <SidebarFooter className="p-4 border-t border-border mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-sm font-medium bg-muted">
                {getInitials(profile?.first_name, profile?.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate">
                {profile?.first_name && profile?.last_name 
                  ? `${profile.first_name} ${profile.last_name}`
                  : user?.email?.split('@')[0] || 'User'
                }
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {profile?.account_type || 'resident'} account
              </span>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 flex-shrink-0"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Log out</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}