import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Logger } from "../shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddressValidationRequest {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface AddressValidationResponse {
  isValid: boolean;
  standardizedAddress?: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
  };
  confidence?: 'high' | 'medium' | 'low';
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleMapsApiKey) {
      Logger.error('GOOGLE_MAPS_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AddressValidationRequest = await req.json();
    
    if (!body.address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct full address for geocoding
    let fullAddress = body.address;
    if (body.city) fullAddress += `, ${body.city}`;
    if (body.state) fullAddress += `, ${body.state}`;
    if (body.zipCode) fullAddress += ` ${body.zipCode}`;

    Logger.info('Validating address', { fullAddress });

    // Use Google Geocoding API for validation
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${googleMapsApiKey}`;
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      const validationResponse: AddressValidationResponse = {
        isValid: false,
        error: 'Address could not be validated'
      };
      
      return new Response(
        JSON.stringify(validationResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data.results[0];
    const components = result.address_components;
    
    // Extract standardized address components
    let streetNumber = '';
    let route = '';
    let city = '';
    let state = '';
    let zipCode = '';

    components.forEach((component: any) => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      } else if (types.includes('route')) {
        route = component.long_name;
      } else if (types.includes('locality')) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.short_name;
      } else if (types.includes('postal_code')) {
        // Extract only 5-digit ZIP code
        zipCode = component.long_name.split('-')[0];
      }
    });

    // Expand street abbreviations
    const expandedRoute = expandStreetAbbreviations(route);
    const streetAddress = `${streetNumber} ${expandedRoute}`.trim();

    // Determine confidence based on geocoding accuracy
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (result.geometry?.location_type === 'ROOFTOP') {
      confidence = 'high';
    } else if (result.geometry?.location_type === 'RANGE_INTERPOLATED') {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    const validationResponse: AddressValidationResponse = {
      isValid: true,
      standardizedAddress: {
        streetAddress,
        city,
        state,
        zipCode
      },
      confidence
    };

    return new Response(
      JSON.stringify(validationResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    Logger.error('Error in address-validation', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Street abbreviation expansion
function expandStreetAbbreviations(street: string): string {
  const streetTypes: Record<string, string> = {
    'Ave': 'Avenue',
    'St': 'Street', 
    'Rd': 'Road',
    'Dr': 'Drive',
    'Ct': 'Court',
    'Blvd': 'Boulevard',
    'Ln': 'Lane',
    'Pl': 'Place',
    'Cir': 'Circle',
    'Ter': 'Terrace',
    'Way': 'Way',
    'Pkwy': 'Parkway',
    'Sq': 'Square',
    'Loop': 'Loop',
    'Hwy': 'Highway'
  };
  
  Object.entries(streetTypes).forEach(([abbrev, full]) => {
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    street = street.replace(regex, full);
  });
  
  return street;
}