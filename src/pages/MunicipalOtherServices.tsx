import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Settings, FileText, DollarSign } from 'lucide-react';
import { ServiceTileManager } from '@/components/municipal/ServiceTileManager';
import { ApplicationHistoryTable } from '@/components/municipal/ApplicationHistoryTable';
import { useMunicipalServiceTiles } from '@/hooks/useMunicipalServiceTiles';
import { useServiceApplications } from '@/hooks/useServiceApplications';
import { useAuth } from '@/contexts/AuthContext';

const MunicipalOtherServices = () => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch service tiles and applications for this municipality
  const { data: serviceTiles, isLoading: tilesLoading } = useMunicipalServiceTiles(profile?.customer_id);
  const { data: applications, isLoading: applicationsLoading } = useServiceApplications();
  
  // Filter OUT sport facilities (has_time_slots = true)
  const nonSportTiles = serviceTiles?.filter(tile => tile.has_time_slots !== true) || [];
  
  // Get tile IDs for non-sport services to filter applications
  const nonSportTileIds = new Set(nonSportTiles.map(tile => tile.id));
  
  // Filter applications for this municipality, exclude drafts, and only include non-sport service applications
  const municipalApplications = applications?.filter(app => 
    app.customer_id === profile?.customer_id && 
    app.status !== 'draft' &&
    nonSportTileIds.has(app.tile_id)
  ) || [];
  
  // Calculate stats
  const activeServices = nonSportTiles.filter(tile => tile.is_active)?.length || 0;
  const totalApplications = municipalApplications.length;
  const pendingReviews = municipalApplications.filter(app => app.status === 'under_review').length;
  const thisMonthRevenue = municipalApplications
    .filter(app => {
      const appDate = new Date(app.created_at);
      const now = new Date();
      return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear() && app.status === 'issued';
    })
    .reduce((sum, app) => {
      const tile = nonSportTiles.find(t => t.id === app.tile_id);
      return sum + (tile?.amount_cents || 0);
    }, 0);

  return (
    <>
      <Helmet>
        <title>Other Services | MuniNow</title>
      </Helmet>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Other Services Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage custom municipal services and track applications
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeServices}</div>
            <p className="text-xs text-muted-foreground">
              {nonSportTiles.length} total services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              All time submissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReviews}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(thisMonthRevenue / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From service applications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="applications">Application History</TabsTrigger>
          <TabsTrigger value="services">Service Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="services" className="space-y-4">
          <ServiceTileManager 
            serviceTiles={nonSportTiles} 
            isLoading={tilesLoading}
            customerId={profile?.customer_id}
          />
        </TabsContent>
        
        <TabsContent value="applications" className="space-y-4">
          <ApplicationHistoryTable 
            applications={municipalApplications}
            serviceTiles={nonSportTiles}
            isLoading={applicationsLoading}
            totalCount={totalApplications}
          />
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
};

export default MunicipalOtherServices;