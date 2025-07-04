import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddressComponents {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  formattedAddress?: string;
}

interface GeocodeResponse {
  isValid: boolean;
  standardizedAddress?: AddressComponents;
  confidence?: 'high' | 'medium' | 'low';
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    if (!googleMapsApiKey) {
      console.error('Google Maps API key not configured');
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'Google Maps API key not configured' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!address) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'Address is required' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Geocoding address:', address);

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`;
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Geocoding failed:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: `Address validation failed: ${data.error_message || data.status}` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = data.results[0];
    const components = result.address_components;
    
    // Parse address components
    const addressData: AddressComponents = {
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      formattedAddress: result.formatted_address
    };

    let streetNumber = '';
    let route = '';

    components.forEach((component: any) => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      } else if (types.includes('route')) {
        route = component.long_name;
      } else if (types.includes('locality')) {
        addressData.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        addressData.state = component.short_name;
      } else if (types.includes('postal_code')) {
        addressData.zipCode = component.long_name;
      }
    });

    // Combine street number and route
    if (streetNumber && route) {
      addressData.streetAddress = `${streetNumber} ${route}`;
    } else if (route) {
      addressData.streetAddress = route;
    }

    // Determine confidence based on address completeness
    const hasAllComponents = addressData.streetAddress && addressData.city && 
                           addressData.state && addressData.zipCode;
    const confidence = hasAllComponents ? 'high' : 'medium';

    const geocodeResponse: GeocodeResponse = {
      isValid: true,
      standardizedAddress: addressData,
      confidence
    };

    console.log('Geocoding successful:', geocodeResponse);

    return new Response(JSON.stringify(geocodeResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-maps-geocoding function:', error);
    return new Response(
      JSON.stringify({ 
        isValid: false, 
        error: 'Internal server error during address validation' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});