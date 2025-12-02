import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Calendar, Clock, Eye } from 'lucide-react';
import { SportBooking } from '@/hooks/useSportBookings';
import { format } from 'date-fns';
import { InlineApprovalMenu } from '@/components/municipal/InlineApprovalMenu';

interface SportBookingHistoryTableProps {
  bookings: SportBooking[];
  isLoading: boolean;
  onViewBooking?: (booking: SportBooking) => void;
}

type FilterPeriod = 'all' | 'today' | 'week' | 'upcoming' | 'past';
type FilterStatus = 'all' | 'pending' | 'submitted' | 'under_review' | 'approved' | 'issued' | 'denied' | 'cancelled';

export function SportBookingHistoryTable({ bookings, isLoading, onViewBooking }: SportBookingHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const today = new Date().toISOString().split('T')[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const filteredBookings = bookings.filter(booking => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesName = booking.applicant_name?.toLowerCase().includes(search);
      const matchesEmail = booking.applicant_email?.toLowerCase().includes(search);
      const matchesFacility = booking.facility?.title?.toLowerCase().includes(search);
      if (!matchesName && !matchesEmail && !matchesFacility) return false;
    }

    // Period filter
    if (periodFilter !== 'all') {
      const bookingDate = booking.booking_date;
      if (periodFilter === 'today' && bookingDate !== today) return false;
      if (periodFilter === 'week' && (bookingDate < today || bookingDate > weekFromNow)) return false;
      if (periodFilter === 'upcoming' && bookingDate < today) return false;
      if (periodFilter === 'past' && bookingDate >= today) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && booking.status !== statusFilter) return false;

    return true;
  });

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      submitted: 'secondary',
      under_review: 'secondary',
      approved: 'default',
      issued: 'default',
      denied: 'destructive',
      cancelled: 'outline',
    };
    
    const labels: Record<string, string> = {
      pending: 'Pending',
      submitted: 'Submitted',
      under_review: 'Under Review',
      approved: 'Approved',
      issued: 'Issued',
      denied: 'Denied',
      cancelled: 'Cancelled',
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or facility..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as FilterPeriod)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            {bookings.length === 0 ? 'No bookings yet.' : 'No bookings match your filters.'}
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Booker</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {format(new Date(booking.booking_date), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(booking.booking_start_time)}
                        {booking.booking_end_time && ` - ${formatTime(booking.booking_end_time)}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{booking.facility?.title || 'Unknown'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{booking.applicant_name || 'N/A'}</span>
                      <span className="text-sm text-muted-foreground">{booking.applicant_email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(booking.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {['pending', 'submitted', 'under_review'].includes(booking.status) && (
                        <InlineApprovalMenu
                          applicationId={booking.id}
                        />
                      )}
                      {onViewBooking && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewBooking(booking)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredBookings.length} of {bookings.length} bookings
      </div>
    </div>
  );
}
