import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, AlertCircle, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { MunicipalityAutocomplete } from '@/components/ui/municipality-autocomplete';
import { useMunicipalServiceTiles, MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';
import ServiceTileCard from '@/components/ServiceTileCard';
import ServiceApplicationModal from '@/components/ServiceApplicationModal';

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
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [selectedTile, setSelectedTile] = useState(null);

  // Fetch service tiles for the selected municipality
  const { 
    data: serviceTiles = [], 
    isLoading: tilesLoading, 
    error: tilesError 
  } = useMunicipalServiceTiles(selectedMunicipality?.customer_id);

  // Filter for sport facilities only (has_time_slots = true)
  const sportTiles = serviceTiles.filter(tile => tile.has_time_slots === true);

  // Filter tiles based on search term
  const filteredTiles = sportTiles.filter(tile =>
    tile.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tile.description && tile.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTileApply = (tile: MunicipalServiceTile) => {
    setSelectedTile(tile);
    setIsApplicationModalOpen(true);
  };

  // Redirect unauthenticated users
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

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-gray-100">
          {/* Main Sport Reservations Content */}
          <div className="p-8">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  Sport Facility Reservations
                </h1>
              </div>
              <p className="text-muted-foreground">
                Book tennis courts, basketball courts, baseball fields, golf courses, and more at your local municipality.
              </p>
            </div>

            {/* Municipality Search */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">
                      Select Your Municipality
                    </h3>
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

            {/* Sport Facilities Section */}
            {selectedMunicipality ? (
              <>
                {/* Search Bar for Facilities */}
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

                {/* Facilities Grid */}
                {tilesLoading ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading sport facilities...</p>
                    </CardContent>
                  </Card>
                ) : tilesError ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Error Loading Facilities</h3>
                      <p className="text-muted-foreground">
                        There was an error loading the sport facilities. Please try again later.
                      </p>
                    </CardContent>
                  </Card>
                ) : filteredTiles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTiles.map((tile) => (
                      <ServiceTileCard
                        key={tile.id}
                        tile={tile}
                        onApply={handleTileApply}
                      />
                    ))}
                  </div>
                ) : searchTerm ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Facilities Found</h3>
                      <p className="text-muted-foreground">
                        No sport facilities match your search term "{searchTerm}". Try different keywords.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">
                        No Sport Facilities Available
                      </h3>
                      <p className="text-muted-foreground">
                        This municipality hasn't configured any sport facilities yet. Check back later.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              /* Instructions when no municipality selected */
              <Card className="text-center py-12">
                <CardContent>
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    Select Your Municipality
                  </h3>
                  <p className="text-muted-foreground">
                    Please select your municipality from the search above to view available sport facilities.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Service Application Modal */}
            {selectedTile && (
              <ServiceApplicationModal
                tile={selectedTile}
                isOpen={isApplicationModalOpen}
                onClose={() => {
                  setIsApplicationModalOpen(false);
                  setSelectedTile(null);
                }}
              />
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default SportReservations;
