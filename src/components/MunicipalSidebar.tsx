import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup
} from '@/components/ui/sidebar';
import { Home, Search, Users, User, LogOut, Building2, Wrench, Settings, Receipt, FileText, Calendar, LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCustomer } from '@/hooks/useCustomer';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { formatAccountType } from '@/lib/formatters';
import { useCustomerServiceConfig } from '@/hooks/useCustomerServiceConfig';

interface NavigationItem {
  title: string;
  icon: LucideIcon;
  url: string;
  serviceKey?: string; // Maps to customer_service_config field
}

// Define all possible navigation items
const allNavigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    icon: Home,
    url: '/municipal/dashboard'
  },
  {
    title: 'Search',
    icon: Search,
    url: '/municipal/search'
  },
  {
    title: 'Building Permits',
    icon: Wrench,
    url: '/municipal/permits',
    serviceKey: 'building_permits_enabled'
  },
  {
    title: 'Business Licenses',
    icon: FileText,
    url: '/municipal/business-licenses',
    serviceKey: 'business_licenses_enabled'
  },
  {
    title: 'Taxes',
    icon: Receipt,
    url: '/municipal/taxes',
    serviceKey: 'taxes_enabled'
  },
  {
    title: 'Sport Reservations',
    icon: Calendar,
    url: '/municipal/sport-reservations',
    serviceKey: 'sport_reservations_enabled'
  },
  {
    title: 'Other Services',
    icon: Settings,
    url: '/municipal/other-services',
    serviceKey: 'other_services_enabled'
  },
  {
    title: 'Merchants',
    icon: Building2,
    url: '/municipal/merchants'
  },
  {
    title: 'Team Members',
    icon: Users,
    url: '/municipal/members'
  },
  {
    title: 'Profile',
    icon: User,
    url: '/municipal/profile'
  },
  {
    title: 'Municipal Settings',
    icon: Settings,
    url: '/municipal/municipal-settings'
  }
];

export function MunicipalSidebar() {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { customer } = useCustomer();
  const { data: serviceConfig } = useCustomerServiceConfig(profile?.customer_id);

  // Get the logo URL from Supabase Storage
  const logoUrl = supabase.storage
    .from('muninow-logo')
    .getPublicUrl('MuniNow_Logo_Exploration_Blue.png').data.publicUrl;

  // Filter navigation items based on service config
  const navigationItems = useMemo(() => {
    return allNavigationItems.filter(item => {
      // If no serviceKey, always show (core navigation)
      if (!item.serviceKey) return true;
      
      // If config not loaded yet, default to showing all services
      if (!serviceConfig) return true;
      
      // Check if the service is enabled
      return serviceConfig[item.serviceKey as keyof typeof serviceConfig] === true;
    });
  }, [serviceConfig]);

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
        <div className="flex items-center justify-between">
          <NavLink to="/municipal/dashboard" className="block hover:opacity-80 transition-opacity">
            <img 
              src={logoUrl} 
              alt="MuniNow" 
              className="h-10 w-auto object-contain"
              style={{ imageRendering: 'crisp-edges' }}
            />
          </NavLink>
          <NotificationDropdown />
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-4">
        <SidebarGroup>
          <div className="mb-6">
            <h2 className="text-base font-medium text-gray-500 uppercase tracking-wide mb-4 pl-4">
              MUNICIPAL PORTAL
            </h2>
            <nav role="navigation" aria-label="Municipal navigation">
              <ul className="space-y-2">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  const Icon = item.icon;
                  
                  return (
                    <li key={item.title}>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) => 
                          `flex items-center gap-3 px-4 py-2 rounded-md text-base min-h-[40px] transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
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

      {/* Customer Info & User Profile Section */}
      <SidebarFooter className="p-4 border-t border-border mt-auto">
        <div className="flex flex-col space-y-3">
          {/* Customer Info */}
          {customer && (
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md">
              <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {customer.legal_entity_name}
                </span>
              </div>
            </div>
          )}
          
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
              <span className="text-xs text-muted-foreground">
                {formatAccountType(profile?.account_type)}
              </span>
            </div>
          </div>
          
          {/* Separator line */}
          <div className="border-t border-border"></div>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className="justify-start text-red-500 hover:text-red-600 hover:bg-red-50 border-border p-3 h-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="text-sm">Log Out</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
