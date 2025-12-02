import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit, Clock, Calendar, DollarSign } from 'lucide-react';
import { SportFacilityForm } from './SportFacilityForm';
import { SportFacility } from '@/hooks/useSportFacilities';

interface SportFacilityManagerProps {
  facilities: SportFacility[];
  isLoading: boolean;
  customerId?: string;
}

export function SportFacilityManager({ facilities, isLoading, customerId }: SportFacilityManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<SportFacility | null>(null);

  const filteredFacilities = facilities.filter(f =>
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateNew = () => {
    setEditingFacility(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (facility: SportFacility) => {
    setEditingFacility(facility);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFacility(null);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search facilities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Facility
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFacility ? 'Edit Facility' : 'Create New Facility'}
              </DialogTitle>
            </DialogHeader>
            <SportFacilityForm
              facility={editingFacility}
              customerId={customerId}
              onClose={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Facilities Grid */}
      {filteredFacilities.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {searchTerm ? 'No facilities match your search.' : 'No sport facilities created yet.'}
            </div>
            {!searchTerm && (
              <Button onClick={handleCreateNew} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Facility
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacilities.map((facility) => {
            const config = facility.time_slot_config || {};
            const operatingHours = config.start_time && config.end_time
              ? `${formatTime(config.start_time)} - ${formatTime(config.end_time)}`
              : 'Not configured';

            return (
              <Card key={facility.id} className="relative hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{facility.title}</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={facility.is_active ? 'default' : 'secondary'}>
                          {facility.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {facility.requires_review && (
                          <Badge variant="outline">Requires Approval</Badge>
                        )}
                        {!facility.requires_payment && (
                          <Badge variant="outline" className="text-green-600 border-green-600">Free</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {facility.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {facility.description}
                    </p>
                  )}

                  {/* Operating Hours */}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{operatingHours}</span>
                  </div>

                  {/* Available Days */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1">
                      {(config.available_days || []).map((day: string) => (
                        <Badge key={day} variant="outline" className="text-xs">
                          {day.slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Slot Duration & Price */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {config.slot_duration_minutes 
                        ? `${config.slot_duration_minutes} min slots`
                        : 'Flexible duration'}
                    </div>
                    <div className="flex items-center gap-1 text-lg font-semibold text-primary">
                      {facility.requires_payment ? (
                        <>
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(facility.amount_cents).replace('$', '')}
                        </>
                      ) : (
                        <span className="text-green-600">Free</span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(facility)}
                    className="w-full gap-2"
                  >
                    <Edit className="h-3 w-3" />
                    Edit Facility
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
