import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Logger } from '../shared/logger.ts';

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
      Logger.error('Google Maps API key not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    let service = url.searchParams.get('service');
    let requestBody = null;
    
    // If no service in query params, try to get it from request body
    if (!service && req.method === 'POST') {
      try {
        requestBody = await req.json();
        service = requestBody.service;
        Logger.debug('Extracted service from request body', { service });
      } catch (error) {
        Logger.error('Failed to parse request body', error);
      }
    }
    
    if (!service) {
      Logger.error('Service parameter missing from both query params and request body');
      return new Response(
        JSON.stringify({ error: 'Service parameter required (provide as query param ?service=js or in request body)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    Logger.info('Processing request for service', { service });

    switch (service) {
      case 'js':
        // Return the Google Maps JavaScript API URL with our secure key
        const apiUrl = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&v=weekly`;
        return new Response(
          JSON.stringify({ url: apiUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'autocomplete':
        // Handle Places Autocomplete API
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'Autocomplete service requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          // Use the already parsed request body if available, otherwise parse it
          const body = requestBody || await req.json();
          const { 
            input, 
            includedRegionCodes, 
            languageCode, 
            locationBias, 
            locationRestriction, 
            inputOffset, 
            regionCode, 
            sessionToken, 
            includedPrimaryTypes 
          } = body;

          if (!input || input.trim() === '') {
            return new Response(
              JSON.stringify({ error: 'Input parameter required for autocomplete' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const autocompleteBody: any = { input: input.trim() };
          
          // Add optional parameters if provided
          if (includedRegionCodes) autocompleteBody.includedRegionCodes = includedRegionCodes;
          if (languageCode) autocompleteBody.languageCode = languageCode;
          if (locationBias) autocompleteBody.locationBias = locationBias;
          if (locationRestriction) autocompleteBody.locationRestriction = locationRestriction;
          if (inputOffset !== undefined) autocompleteBody.inputOffset = inputOffset;
          if (regionCode) autocompleteBody.regionCode = regionCode;
          if (sessionToken) autocompleteBody.sessionToken = sessionToken;
          if (includedPrimaryTypes) autocompleteBody.includedPrimaryTypes = includedPrimaryTypes;

          Logger.debug('Making autocomplete request', autocompleteBody);

          const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleMapsApiKey,
              'X-Goog-FieldMask': 'suggestions.placePrediction.text,suggestions.placePrediction.placeId'
            },
            body: JSON.stringify(autocompleteBody)
          });

          const data = await response.json();
          
          if (!response.ok) {
            Logger.error('Autocomplete API error', data);
            return new Response(
              JSON.stringify({ error: 'Autocomplete API error', details: data }),
              { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          Logger.error('Error processing autocomplete request', error);
          return new Response(
            JSON.stringify({ error: 'Failed to process autocomplete request' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'place-details':
        // Handle Place Details API
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'Place details service requires POST method' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          // Use the already parsed request body if available, otherwise parse it
          const body = requestBody || await req.json();
          const { placeId, sessionToken } = body;
          
          if (!placeId) {
            return new Response(
              JSON.stringify({ error: 'placeId parameter required for place details' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const detailsBody: any = {};
          if (sessionToken) detailsBody.sessionToken = sessionToken;

          Logger.debug('Making place details request', { placeId });

          const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleMapsApiKey,
              'X-Goog-FieldMask': 'addressComponents,formattedAddress'
            }
          });

          const data = await response.json();
          
          if (!response.ok) {
            Logger.error('Place details API error', data);
            return new Response(
              JSON.stringify({ error: 'Place details API error', details: data }),
              { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          Logger.error('Error processing place details request', error);
          return new Response(
            JSON.stringify({ error: 'Failed to process place details request' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'geocoding':
        const address = url.searchParams.get('address');
        if (!address) {
          return new Response(
            JSON.stringify({ error: 'Address parameter required for geocoding' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`;
        
        try {
          const response = await fetch(geocodingUrl);
          const data = await response.json();
          
          return new Response(
            JSON.stringify(data),
            { 
              status: response.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        } catch (error) {
          Logger.error('Geocoding error', error);
          return new Response(
            JSON.stringify({ error: 'Geocoding API error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported service. Available services: js, autocomplete, place-details, geocoding' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    Logger.error('Internal server error in google-maps-proxy', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});