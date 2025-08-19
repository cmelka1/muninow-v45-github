import React, { useState } from 'react';
import { Search, MapPin, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MunicipalityAutocomplete } from '@/components/ui/municipality-autocomplete';
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
        {selectedMunicipality ? (
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

            {/* Services Grid - Placeholder for now */}
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <ResponsiveTypography variant="h3" className="mb-2">
                  Services Coming Soon
                </ResponsiveTypography>
                <p className="text-muted-foreground">
                  Municipal service tiles will be available once this municipality configures their services.
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Instructions when no municipality selected */
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
      </ResponsiveContainer>
    </div>
  );
};

export default OtherServices;