import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, FileText, DollarSign, Settings } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SportFacilityManager } from '@/components/sport-reservations/SportFacilityManager';
import { SportBookingHistoryTable } from '@/components/sport-reservations/SportBookingHistoryTable';
import { WeekNavigator } from '@/components/municipal/WeekNavigator';
import { DayScheduleTimeline } from '@/components/municipal/DayScheduleTimeline';
import { DayScheduleList } from '@/components/municipal/DayScheduleList';
import { QuickBookingDialog } from '@/components/municipal/QuickBookingDialog';
import { useSportFacilities } from '@/hooks/useSportFacilities';
import { useSportBookings } from '@/hooks/useSportBookings';
import { useDailyBookings } from '@/hooks/useDailyBookings';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const MunicipalSportReservations = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const getLocalDateString = (date: Date = new Date()) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>(isMobile ? 'list' : 'timeline');
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [prefilledBooking, setPrefilledBooking] = useState<{
    facilityId?: string;
    date?: string;
    time?: string;
  }>({});
  
  // Use sport-specific hooks
  const { data: sportFacilities, isLoading: facilitiesLoading } = useSportFacilities(profile?.customer_id);
  const { data: sportBookings, isLoading: bookingsLoading } = useSportBookings(profile?.customer_id);
  const { data: dailyBookings, isLoading: dailyLoading } = useDailyBookings(profile?.customer_id, selectedDate);
  
  // Calculate stats
  const activeFacilities = sportFacilities?.filter(f => f.is_active)?.length || 0;
  const totalBookings = sportBookings?.length || 0;
  const upcomingReservations = sportBookings?.filter(b => 
    b.status === 'approved' && b.booking_date && new Date(b.booking_date) >= new Date()
  ).length || 0;
  const thisMonthRevenue = sportBookings
    ?.filter(b => {
      if (!b.booking_date) return false;
      const bDate = new Date(b.booking_date);
      const now = new Date();
      return bDate.getMonth() === now.getMonth() && 
             bDate.getFullYear() === now.getFullYear() && 
             b.payment_status === 'paid' &&
             ['approved', 'issued', 'reserved'].includes(b.status);
    })
    .reduce((sum, b) => sum + (b.total_amount_cents || 0), 0) || 0;

  const todayBookings = dailyBookings?.length || 0;
  const todayPending = dailyBookings?.filter(b => b.status === 'pending' || b.status === 'under_review').length || 0;
  const todayPaid = dailyBookings?.filter(b => b.payment_status === 'paid').length || 0;

  const handleBookingClick = (bookingId: string) => {
    navigate(`/municipal/service-application/${bookingId}`);
  };

  const handleNewBooking = (facilityId?: string, time?: string) => {
    setPrefilledBooking({ facilityId, date: selectedDate, time });
    setBookingDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
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
            <p className="text-xs text-muted-foreground">{sportFacilities?.length || 0} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingReservations}</div>
            <p className="text-xs text-muted-foreground">Approved bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(thisMonthRevenue / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="bookings">All Bookings</TabsTrigger>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4 focus-visible:ring-0 focus-visible:outline-none">
          <Card className="p-6">
            <div className="mb-6">
              <WeekNavigator
                customerId={profile?.customer_id}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                daysToShow={30}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Bookings Today</span>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{todayBookings}</div>
                <p className="text-xs text-muted-foreground">{todayPending} pending</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Paid</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{todayPaid}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Active Facilities</span>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{activeFacilities}</div>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>

            <div className="flex justify-end mb-4">
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
                <ToggleGroupItem value="timeline"><Calendar className="h-4 w-4 mr-2" />Timeline</ToggleGroupItem>
                <ToggleGroupItem value="list"><FileText className="h-4 w-4 mr-2" />List</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {viewMode === 'timeline' ? (
              <DayScheduleTimeline
                bookings={dailyBookings || []}
                facilities={sportFacilities || []}
                isLoading={dailyLoading}
                selectedDate={selectedDate}
                onBookingClick={handleBookingClick}
                onNewBooking={handleNewBooking}
              />
            ) : (
              <DayScheduleList
                bookings={dailyBookings || []}
                facilities={sportFacilities || []}
                isLoading={dailyLoading}
                onBookingClick={handleBookingClick}
                onNewBooking={() => handleNewBooking()}
              />
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="bookings" className="space-y-4 focus-visible:ring-0">
          <SportBookingHistoryTable 
            bookings={sportBookings || []}
            isLoading={bookingsLoading}
            onViewBooking={(b) => handleBookingClick(b.id)}
          />
        </TabsContent>

        <TabsContent value="facilities" className="space-y-4 focus-visible:ring-0">
          <SportFacilityManager 
            facilities={sportFacilities || []} 
            isLoading={facilitiesLoading}
            customerId={profile?.customer_id}
          />
        </TabsContent>
      </Tabs>

      <QuickBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        facilities={sportFacilities || []}
        customerId={profile?.customer_id}
        prefilledFacilityId={prefilledBooking.facilityId}
        prefilledDate={prefilledBooking.date}
        prefilledTime={prefilledBooking.time}
        onSuccess={() => {}}
      />
    </div>
  );
};

export default MunicipalSportReservations;
