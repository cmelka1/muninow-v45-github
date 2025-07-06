import { supabase } from '@/integrations/supabase/client';

// Google Maps Script Loader
export const loadGoogleMapsScript = async (): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    if (window.google) {
      resolve(window.google);
      return;
    }

    try {
      // Fetch API key from edge function
      const { data, error } = await supabase.functions.invoke('get-google-maps-key');
      
      if (error) {
        throw new Error(`Failed to fetch Google Maps API key: ${error.message}`);
      }
      
      const { apiKey } = data;
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve(window.google);
      script.onerror = reject;
      
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error loading Google Maps API:', error);
      reject(error);
    }
  });
};