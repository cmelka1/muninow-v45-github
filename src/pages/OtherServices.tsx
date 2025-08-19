import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { MunicipalityAutocomplete } from '@/components/ui/municipality-autocomplete';

interface Municipality {
  customer_id: string;
  legal_entity_name: string;
  doing_business_as: string;
  business_city: string;
  business_state: string;
}

const OtherServices: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
          {/* Main Other Services Content */}
          <div className="p-8">
            {/* Header Section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Other Municipal Services
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Search for your municipality to access additional services and applications not covered by standard utilities, permits, or taxes.
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
                    <h3 className="text-xl font-semibold mb-2">
                      Services Coming Soon
                    </h3>
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
                  <h3 className="text-xl font-semibold mb-2">
                    Select Your Municipality
                  </h3>
                  <p className="text-muted-foreground">
                    Please select your municipality from the search above to view available services and applications.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default OtherServices;