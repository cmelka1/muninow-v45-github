import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { MunicipalSidebar } from '@/components/MunicipalSidebar';

interface MunicipalLayoutProps {
  children: React.ReactNode;
}

export const MunicipalLayout: React.FC<MunicipalLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <MunicipalSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};