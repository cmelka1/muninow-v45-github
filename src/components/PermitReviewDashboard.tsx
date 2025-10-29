import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { PermitStatusBadge } from './PermitStatusBadge';
import { PermitStatusChangeDialog } from './PermitStatusChangeDialog';
import { PermitStatus } from '@/hooks/usePermitWorkflow';
import { Search, Eye, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PermitApplication {
  permit_id: string;
  permit_number: string;
  permit_type_id: string;
  permit_type_name: string | null;
  application_status: PermitStatus;
  property_address: string;
  applicant_full_name: string;
  submitted_at: string;
  assigned_reviewer_id: string;
  created_at: string;
  estimated_construction_value_cents: number;
}

interface ReviewStats {
  total: number;
  pending_review: number;
  under_review: number;
  awaiting_info: number;
  approved_this_week: number;
}

export const PermitReviewDashboard: React.FC = () => {
  const [permits, setPermits] = useState<PermitApplication[]>([]);
  const [filteredPermits, setFilteredPermits] = useState<PermitApplication[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    pending_review: 0,
    under_review: 0,
    awaiting_info: 0,
    approved_this_week: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPermitId, setSelectedPermitId] = useState<string | null>(null);
  const [selectedPermitStatus, setSelectedPermitStatus] = useState<PermitStatus>('draft');

  const fetchPermits = async () => {
    try {
      const { data, error } = await supabase
        .from('permit_applications')
        .select('*, permit_types_v2(name)')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map((item: any) => ({
        ...item,
        permit_type_name: item.permit_types_v2?.name || null
      }));

      setPermits(transformedData);
      calculateStats(transformedData);
    } catch (error) {
      console.error('Error fetching permits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (permitsData: PermitApplication[]) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: permitsData.length,
      pending_review: permitsData.filter(p => p.application_status === 'submitted').length,
      under_review: permitsData.filter(p => p.application_status === 'under_review').length,
      awaiting_info: permitsData.filter(p => p.application_status === 'information_requested').length,
      approved_this_week: permitsData.filter(p => 
        p.application_status === 'approved' && 
        new Date(p.created_at) > oneWeekAgo
      ).length
    };

    setStats(stats);
  };

  // Filter permits based on search and status
  useEffect(() => {
    let filtered = permits;

    if (searchTerm) {
      filtered = filtered.filter(permit =>
        permit.permit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permit.applicant_full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permit.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permit.permit_type_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(permit => permit.application_status === statusFilter);
    }

    setFilteredPermits(filtered);
  }, [permits, searchTerm, statusFilter]);

  useEffect(() => {
    fetchPermits();
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const openStatusDialog = (permitId: string, currentStatus: PermitStatus) => {
    setSelectedPermitId(permitId);
    setSelectedPermitStatus(currentStatus);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Permit Review Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and review permit applications
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All permit applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_review}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting initial review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.under_review}</div>
            <p className="text-xs text-muted-foreground">
              Currently being reviewed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Week</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved_this_week}</div>
            <p className="text-xs text-muted-foreground">
              Recently approved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Applications</CardTitle>
          <CardDescription>
            Search and filter permit applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by permit number, applicant, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="information_requested">Info Requested</SelectItem>
                <SelectItem value="resubmitted">Resubmitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Permits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Permit Applications</CardTitle>
          <CardDescription>
            {filteredPermits.length} applications found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permit #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPermits.map((permit) => (
                <TableRow key={permit.permit_id}>
                  <TableCell className="font-medium">
                    {permit.permit_number || 'Pending'}
                  </TableCell>
                  <TableCell>{permit.permit_type_name || 'Unknown'}</TableCell>
                  <TableCell>{permit.applicant_full_name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {permit.property_address}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(permit.estimated_construction_value_cents)}
                  </TableCell>
                  <TableCell>
                    <PermitStatusBadge status={permit.application_status} />
                  </TableCell>
                  <TableCell>
                    {permit.submitted_at 
                      ? formatDistanceToNow(new Date(permit.submitted_at), { addSuffix: true })
                      : 'Not submitted'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* TODO: Implement permit view navigation */}}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openStatusDialog(permit.permit_id, permit.application_status)}
                      >
                        Update Status
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      {selectedPermitId && (
        <PermitStatusChangeDialog
          isOpen={!!selectedPermitId}
          onClose={() => setSelectedPermitId(null)}
          permitId={selectedPermitId}
          currentStatus={selectedPermitStatus}
          onStatusChanged={fetchPermits}
        />
      )}
    </div>
  );
};