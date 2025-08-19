import React, { useState } from 'react';
import { Search, MapPin, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MunicipalityAutocomplete } from '@/components/ui/municipality-autocomplete';
import ServiceTileCard from '@/components/ServiceTileCard';
import ServiceApplicationModal from '@/components/ServiceApplicationModal';
import { useMunicipalServiceTiles, MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';
import { useUserServiceApplications } from '@/hooks/useServiceApplications';
import ResponsiveContainer from '@/components/ui/responsive-container';
import ResponsiveTypography from '@/components/ui/responsive-typography';

interface Municipality {
  customer_id: string;
  legal_entity_name: string;
  doing_business_as: string;
  business_city: string;
  business_state: string;
}

const OtherServices: React.FC = () => {
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTile, setSelectedTile] = useState<MunicipalServiceTile | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);

  const { data: serviceTiles, isLoading: tilesLoading } = useMunicipalServiceTiles(
    selectedMunicipality?.customer_id
  );
  
  const { data: userApplications } = useUserServiceApplications();

  const filteredTiles = serviceTiles?.filter(tile => 
    tile.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tile.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleApplyForService = (tile: MunicipalServiceTile) => {
    setSelectedTile(tile);
    setIsApplicationModalOpen(true);
  };

  const getApplicationStatus = (tileId: string) => {
    return userApplications?.find(app => app.tile_id === tileId)?.status;
  };

  return (
    <div className="min-h-screen bg-background">
      <ResponsiveContainer variant="container">
        {/* Header Section */}
        <div className="text-center mb-8">
          <ResponsiveTypography variant="h1" className="mb-4">
            Other Municipal Services
          </ResponsiveTypography>
          <ResponsiveTypography variant="body" className="text-muted-foreground max-w-2xl mx-auto">
            Search for your municipality to access additional services and applications not covered by standard utilities, permits, or taxes.
          </ResponsiveTypography>
        </div>

        {/* Municipality Search */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <ResponsiveTypography variant="h3">
                  Select Your Municipality
                </ResponsiveTypography>
              </div>
              
              <MunicipalityAutocomplete
                onSelect={setSelectedMunicipality}
                placeholder="Search for your city or municipality..."
              />
              
              {selectedMunicipality && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">{selectedMunicipality.legal_entity_name}</p>
                  {selectedMunicipality.doing_business_as && 
                    selectedMunicipality.doing_business_as !== selectedMunicipality.legal_entity_name && (
                    <p className="text-sm text-muted-foreground">
                      DBA: {selectedMunicipality.doing_business_as}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {selectedMunicipality.business_city}, {selectedMunicipality.business_state}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services Section */}
        {selectedMunicipality && (
          <>
            {/* Search Bar for Services */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search available services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Services Grid */}
            {tilesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="h-48 animate-pulse">
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-full"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTiles.map((tile) => {
                  const applicationStatus = getApplicationStatus(tile.id);
                  return (
                    <div key={tile.id} className="relative">
                      <ServiceTileCard
                        tile={tile}
                        onApply={handleApplyForService}
                      />
                      {applicationStatus && (
                        <Badge 
                          className="absolute top-2 left-2" 
                          variant={
                            applicationStatus === 'paid' ? 'default' :
                            applicationStatus === 'approved' ? 'secondary' :
                            applicationStatus === 'denied' ? 'destructive' :
                            'outline'
                          }
                        >
                          {applicationStatus.charAt(0).toUpperCase() + applicationStatus.slice(1)}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <ResponsiveTypography variant="h3" className="mb-2">
                    No Services Available
                  </ResponsiveTypography>
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? `No services found matching "${searchTerm}"` 
                      : 'This municipality has not configured any additional services yet.'
                    }
                  </p>
                  {searchTerm && (
                    <Button 
                      variant="outline" 
                      onClick={() => setSearchTerm('')}
                      className="mt-4"
                    >
                      Clear Search
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Instructions when no municipality selected */}
        {!selectedMunicipality && (
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <ResponsiveTypography variant="h3" className="mb-2">
                Select Your Municipality
              </ResponsiveTypography>
              <p className="text-muted-foreground">
                Please select your municipality from the search above to view available services and applications.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Application Modal */}
        <ServiceApplicationModal
          tile={selectedTile}
          isOpen={isApplicationModalOpen}
          onClose={() => {
            setIsApplicationModalOpen(false);
            setSelectedTile(null);
          }}
        />
      </ResponsiveContainer>
    </div>
  );
};

export default OtherServices;