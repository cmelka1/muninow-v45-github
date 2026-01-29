import React from 'react';
import { format } from 'date-fns';
import { 
  Calendar, 
  CheckCircle, 
  Circle, 
  MoreHorizontal, 
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PermitInspection } from '@/hooks/usePermitInspections';
import { generateICSContent, generateGoogleCalendarUrl, downloadICSFile } from '@/lib/calendarUtils';

interface PermitInspectionsListProps {
  inspections: PermitInspection[] | undefined;
  isLoading: boolean;
  propertyAddress: string;
}

export const PermitInspectionsList: React.FC<PermitInspectionsListProps> = ({
  inspections,
  isLoading,
  propertyAddress,
}) => {
  const handleAddToCalendar = (inspection: PermitInspection, type: 'outlook' | 'google' | 'apple') => {
    if (!inspection.scheduled_date) return;

    const startDate = new Date(inspection.scheduled_date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration

    const event = {
      title: `Inspection: ${inspection.inspection_type} at ${propertyAddress}`,
      description: `Inspection Type: ${inspection.inspection_type}\nStatus: ${inspection.status}\nNotes: ${inspection.notes || 'None'}`,
      location: propertyAddress,
      startTime: startDate,
      endTime: endDate,
    };

    if (type === 'google') {
      window.open(generateGoogleCalendarUrl(event), '_blank');
    } else {
      const content = generateICSContent(event);
      downloadICSFile(`${inspection.inspection_type.replace(/\s+/g, '_')}_inspection.ics`, content);
    }
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default'; // primary/black
      case 'scheduled':
        return 'secondary'; // gray
      case 'failed':
        return 'destructive'; // red
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!inspections || inspections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No inspections scheduled yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="h-5 w-5" />
          Inspections ({inspections.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {inspections.map((inspection) => (
            <div key={inspection.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{inspection.inspection_type}</span>
                  <Badge variant={getStatusColor(inspection.status)} className="text-xs">
                    {inspection.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {inspection.scheduled_date 
                        ? format(new Date(inspection.scheduled_date), 'PPP p')
                        : 'Date not set'}
                    </span>
                  </div>
                  {inspection.profiles && (
                    <div className="flex items-center gap-1">
                      <Circle className="h-3 w-3" />
                      <span>{inspection.profiles.first_name} {inspection.profiles.last_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {inspection.scheduled_date && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="hidden sm:flex">
                        <Calendar className="h-3.5 w-3.5 mr-2" />
                        Add to Calendar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAddToCalendar(inspection, 'outlook')}>
                        <Download className="h-4 w-4 mr-2" />
                        Outlook / Apple Calendar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddToCalendar(inspection, 'google')}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Google Calendar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {inspection.scheduled_date && (
                      <>
                        <DropdownMenuItem onClick={() => handleAddToCalendar(inspection, 'outlook')}>
                          <Download className="h-4 w-4 mr-2" />
                          Add to Outlook / Apple
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddToCalendar(inspection, 'google')}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Add to Google Calendar
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
