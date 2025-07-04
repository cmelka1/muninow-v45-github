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
import muniNowLogo from '@/assets/muninow-logo.png';

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
        <NavLink to="/dashboard" className="block">
          <img 
            src={muniNowLogo} 
            alt="MuniNow" 
            className="h-10 w-auto hover:opacity-80 transition-opacity"
          />
        </NavLink>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-4">
        <SidebarGroup>
          <div className="mb-6">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4 pl-4">
              MAIN MENU
            </h2>
            <nav role="navigation" aria-label="Main navigation">
              <ul className="space-y-2">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  const Icon = item.icon;
                  
                  return (
                    <li key={item.title}>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) => 
                          `flex items-center gap-3 px-4 py-2 rounded-md text-sm min-h-[40px] transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                            isActive 
                              ? 'bg-primary/5 text-primary font-medium' 
                              : 'text-gray-600 hover:bg-primary/5 hover:text-primary'
                          }`
                        }
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        <span className="leading-tight">{item.title}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </SidebarGroup>
      </SidebarContent>

      {/* User Profile Section */}
      <SidebarFooter className="p-4 border-t border-border mt-auto">
        <div className="flex flex-col space-y-3">
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
            className="justify-start text-red-500 hover:text-red-600 hover:bg-red-50 p-2 h-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="text-sm">Log Out</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}