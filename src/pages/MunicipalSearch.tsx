import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, FileText, Building2, Users } from 'lucide-react';

const MunicipalSearch = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground">
          Search and filter bills, merchants, and resident/business profiles for your municipality.
        </p>
      </div>

      {/* Search Categories */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="text-center">
            <FileText className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle>Bills Search</CardTitle>
            <CardDescription>
              Search bills assigned to merchants under your municipality
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Coming soon - Advanced bill filtering and search functionality
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle>Merchants Search</CardTitle>
            <CardDescription>
              View and search merchants registered under your municipality
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Coming soon - Merchant directory and search tools
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Users className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle>Residents & Businesses</CardTitle>
            <CardDescription>
              Search profiles of residents and businesses with bills in your municipality
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Coming soon - User profile search and filtering
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Implementation Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Implementation Plan
          </CardTitle>
          <CardDescription>
            Planned search functionality for municipal administrators
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-medium">Bills Search</h4>
              <p className="text-sm text-muted-foreground">
                Filter by status, amount, due date, merchant, and bill type. Export capabilities for reporting.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-medium">Merchant Directory</h4>
              <p className="text-sm text-muted-foreground">
                Browse merchant profiles, view processing status, and access merchant-specific bill data.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-medium">User Profiles</h4>
              <p className="text-sm text-muted-foreground">
                Search resident and business profiles with bills, view payment history, and access contact information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MunicipalSearch;