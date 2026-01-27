import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, MapPin, AlertCircle, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { MunicipalityAutocomplete } from '@/components/ui/municipality-autocomplete';
import { useActiveSportFacilities, SportFacility } from '@/hooks/useSportFacilities';
import { SportFacilityCard } from '@/components/sport-reservations/SportFacilityCard';
import { SportBookingModal } from '@/components/sport-reservations/SportBookingModal';

interface Municipality {
  customer_id: string;
  legal_entity_name: string;
  doing_business_as: string;
  business_city: string;
  business_state: string;
}

const SportReservations: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<SportFacility | null>(null);

  // Use sport-specific hook
  const { 
    data: sportFacilities = [], 
    isLoading: facilitiesLoading, 
    error: facilitiesError 
  } = useActiveSportFacilities(selectedMunicipality?.customer_id);

  // Filter by search
  const filteredFacilities = sportFacilities.filter(f =>
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBookNow = (facility: SportFacility) => {
    setSelectedFacility(facility);
    setIsBookingModalOpen(true);
  };

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/signin');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <Helmet>
        <title>Rentals | MuniNow</title>
      </Helmet>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-gray-100">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Sport Facility Reservations</h1>
              <p className="text-muted-foreground">
                Book tennis courts, basketball courts, baseball fields, golf courses, and more.
              </p>
            </div>

            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Select Your Municipality</h3>
                  </div>
                  
                  <MunicipalityAutocomplete
                    onSelect={setSelectedMunicipality}
                    placeholder="Search for your city or municipality..."
                  />
                  
                  {selectedMunicipality && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium">{selectedMunicipality.legal_entity_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedMunicipality.business_city}, {selectedMunicipality.business_state}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedMunicipality ? (
              <>
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search sport facilities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {facilitiesLoading ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading facilities...</p>
                    </CardContent>
                  </Card>
                ) : facilitiesError ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Error Loading Facilities</h3>
                      <p className="text-muted-foreground">Please try again later.</p>
                    </CardContent>
                  </Card>
                ) : filteredFacilities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFacilities.map((facility) => (
                      <SportFacilityCard
                        key={facility.id}
                        facility={facility}
                        onBookNow={handleBookNow}
                      />
                    ))}
                  </div>
                ) : searchTerm ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Facilities Found</h3>
                      <p className="text-muted-foreground">No facilities match "{searchTerm}".</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Sport Facilities Available</h3>
                      <p className="text-muted-foreground">This municipality hasn't configured any facilities yet.</p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Select Your Municipality</h3>
                  <p className="text-muted-foreground">Please select your municipality to view available sport facilities.</p>
                </CardContent>
              </Card>
            )}

            <SportBookingModal
              facility={selectedFacility}
              isOpen={isBookingModalOpen}
              onClose={() => {
                setIsBookingModalOpen(false);
                setSelectedFacility(null);
              }}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default SportReservations;
