import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, FileText, DollarSign, Settings, Clock, CheckCircle } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ServiceTileManager } from '@/components/municipal/ServiceTileManager';
import { ApplicationHistoryTable } from '@/components/municipal/ApplicationHistoryTable';
import { WeekNavigator } from '@/components/municipal/WeekNavigator';
import { DayScheduleTimeline } from '@/components/municipal/DayScheduleTimeline';
import { DayScheduleList } from '@/components/municipal/DayScheduleList';
import { QuickBookingDialog } from '@/components/municipal/QuickBookingDialog';
import { useMunicipalServiceTiles } from '@/hooks/useMunicipalServiceTiles';
import { useServiceApplications } from '@/hooks/useServiceApplications';
import { useDailyBookings } from '@/hooks/useDailyBookings';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const MunicipalSportReservations = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // State management
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>(isMobile ? 'list' : 'timeline');
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [prefilledBooking, setPrefilledBooking] = useState<{
    facilityId?: string;
    date?: string;
    time?: string;
  }>({});
  
  // Fetch service tiles and applications for this municipality
  const { data: serviceTiles, isLoading: tilesLoading } = useMunicipalServiceTiles(profile?.customer_id);
  const { data: applications, isLoading: applicationsLoading } = useServiceApplications();
  const { data: dailyBookings, isLoading: dailyLoading } = useDailyBookings(profile?.customer_id, selectedDate);
  
  // Filter for sport facilities only (has_time_slots = true)
  const sportTiles = serviceTiles?.filter(tile => tile.has_time_slots === true) || [];
  
  // Filter applications for sport facilities and exclude drafts
  const sportApplications = applications?.filter(app => {
    const isFromSportTile = sportTiles.some(tile => tile.id === app.tile_id);
    return app.customer_id === profile?.customer_id && app.status !== 'draft' && isFromSportTile;
  }) || [];
  
  // Calculate stats
  const activeFacilities = sportTiles.filter(tile => tile.is_active)?.length || 0;
  const totalBookings = sportApplications.length;
  const upcomingReservations = sportApplications.filter(app => 
    app.status === 'approved' && app.booking_date && new Date(app.booking_date) >= new Date()
  ).length;
  const thisMonthRevenue = sportApplications
    .filter(app => {
      const appDate = new Date(app.created_at);
      const now = new Date();
      return appDate.getMonth() === now.getMonth() && 
             appDate.getFullYear() === now.getFullYear() && 
             app.status === 'issued';
    })
    .reduce((sum, app) => {
      const tile = sportTiles.find(t => t.id === app.tile_id);
      return sum + (tile?.amount_cents || 0);
    }, 0);

  // Today's stats for selected date
  const todayBookings = dailyBookings?.length || 0;
  const todayPending = dailyBookings?.filter(b => b.status === 'pending' || b.status === 'under_review').length || 0;
  const todayPaid = dailyBookings?.filter(b => b.payment_status === 'paid').length || 0;

  // Handlers
  const handleBookingClick = (bookingId: string) => {
    navigate(`/municipal/service-application/${bookingId}`);
  };

  const handleNewBooking = (facilityId?: string, time?: string) => {
    setPrefilledBooking({
      facilityId,
      date: selectedDate,
      time,
    });
    setBookingDialogOpen(true);
  };

  const handleBookingSuccess = () => {
    // Queries will auto-refresh due to invalidation in the mutation
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sport Facility Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage sport facility reservations, schedules, and bookings
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Facilities</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeFacilities}</div>
            <p className="text-xs text-muted-foreground">
              {sportTiles.length} total facilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              All time reservations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Reservations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingReservations}</div>
            <p className="text-xs text-muted-foreground">
              Approved bookings ahead
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
              From facility bookings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="bookings">All Bookings</TabsTrigger>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
        </TabsList>

        {/* NEW: Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          {/* Week Navigator */}
          <WeekNavigator
            customerId={profile?.customer_id}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            daysToShow={30}
          />

          {/* Quick Stats Bar for Selected Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bookings Today</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayBookings}</div>
                <p className="text-xs text-muted-foreground">
                  {todayPending} pending approval
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayPaid}</div>
                <p className="text-xs text-muted-foreground">
                  Payment completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Facilities</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeFacilities}</div>
                <p className="text-xs text-muted-foreground">
                  Available for booking
                </p>
              </CardContent>
            </Card>
          </div>

          {/* View Toggle */}
          <div className="flex justify-end">
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
              <ToggleGroupItem value="timeline" aria-label="Timeline view">
                <Calendar className="h-4 w-4 mr-2" />
                Timeline
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <FileText className="h-4 w-4 mr-2" />
                List
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Schedule Views */}
          {viewMode === 'timeline' ? (
            <DayScheduleTimeline
              bookings={dailyBookings || []}
              facilities={sportTiles}
              isLoading={dailyLoading}
              selectedDate={selectedDate}
              onBookingClick={handleBookingClick}
              onNewBooking={handleNewBooking}
            />
          ) : (
            <DayScheduleList
              bookings={dailyBookings || []}
              facilities={sportTiles}
              isLoading={dailyLoading}
              onBookingClick={handleBookingClick}
              onNewBooking={() => handleNewBooking()}
            />
          )}
        </TabsContent>
        
        {/* All Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <ApplicationHistoryTable 
            applications={sportApplications}
            serviceTiles={sportTiles}
            isLoading={applicationsLoading}
            totalCount={totalBookings}
          />
        </TabsContent>

        {/* Facilities Tab */}
        <TabsContent value="facilities" className="space-y-4">
          <ServiceTileManager 
            serviceTiles={sportTiles} 
            isLoading={tilesLoading}
            customerId={profile?.customer_id}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Booking Dialog */}
      <QuickBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        facilities={sportTiles}
        customerId={profile?.customer_id}
        prefilledFacilityId={prefilledBooking.facilityId}
        prefilledDate={prefilledBooking.date}
        prefilledTime={prefilledBooking.time}
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
};

export default MunicipalSportReservations;
