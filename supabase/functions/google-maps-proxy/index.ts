import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleMapsApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const service = url.searchParams.get('service');
    
    if (!service) {
      return new Response(
        JSON.stringify({ error: 'Service parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let apiUrl = '';
    
    switch (service) {
      case 'js':
        // Return the Google Maps JavaScript API URL with our secure key
        apiUrl = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&v=weekly`;
        break;
      case 'geocoding':
        const address = url.searchParams.get('address');
        if (!address) {
          return new Response(
            JSON.stringify({ error: 'Address parameter required for geocoding' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported service' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (service === 'js') {
      // For JavaScript API, return the URL
      return new Response(
        JSON.stringify({ url: apiUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // For other services, proxy the request
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      return new Response(
        JSON.stringify(data),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});