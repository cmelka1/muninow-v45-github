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
    <Sidebar className="w-64 bg-white border-r border-gray-200">
      {/* Header */}
      <SidebarHeader className="p-6">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-blue-600">MuniNow</h1>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Navigation */}
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                const Icon = item.icon;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) => 
                          `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                            isActive 
                              ? 'bg-primary/5 text-primary font-semibold' 
                              : 'text-gray-600 hover:bg-primary/5 hover:text-primary'
                          }`
                        }
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Profile Section */}
      <SidebarFooter className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-sm">
                {getInitials(profile?.first_name, profile?.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {profile?.first_name && profile?.last_name 
                  ? `${profile.first_name} ${profile.last_name}`
                  : user?.email?.split('@')[0] || 'User'
                }
              </span>
              <span className="text-xs text-gray-500 capitalize">
                {profile?.account_type || 'resident'} account
              </span>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-red-500 hover:bg-red-50 hover:text-red-600 p-2"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}