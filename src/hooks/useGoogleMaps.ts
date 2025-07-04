import { useState, useEffect } from 'react';

declare global {
  interface Window {
    google?: any;
    initGoogleMaps?: () => void;
  }
}

interface UseGoogleMapsReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useGoogleMaps = (): UseGoogleMapsReturn => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already loading
    const existingScript = document.querySelector('#google-maps-script');
    if (existingScript) {
      setIsLoading(true);
      return;
    }

    const loadGoogleMaps = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Create callback function
        window.initGoogleMaps = () => {
          setIsLoaded(true);
          setIsLoading(false);
        };

        // Create script element
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAutc-da7balOk5s-qnFKMpg7c3ZQ5cmzk&libraries=places&callback=initGoogleMaps`;
        script.async = true;
        script.defer = true;

        script.onerror = () => {
          setError('Failed to load Google Maps API');
          setIsLoading(false);
        };

        document.head.appendChild(script);
      } catch (err) {
        setError('Error loading Google Maps API');
        setIsLoading(false);
      }
    };

    loadGoogleMaps();

    return () => {
      // Cleanup on unmount
      if (window.initGoogleMaps) {
        delete window.initGoogleMaps;
      }
    };
  }, []);

  return { isLoaded, isLoading, error };
};