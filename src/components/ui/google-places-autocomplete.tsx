import React, { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface AddressComponents {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

interface GooglePlacesAutocompleteProps {
  placeholder?: string;
  onAddressSelect: (addressComponents: AddressComponents) => void;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

// Address abbreviation expansion for standardization
const expandAddressAbbreviations = (address: string): string => {
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
    'Pkwy': 'Parkway'
  };
  
  Object.entries(streetTypes).forEach(([abbrev, full]) => {
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    address = address.replace(regex, full);
  });
  
  return address;
};

const parseAddressComponents = (components: any[]): AddressComponents => {
  const result: Partial<AddressComponents> = {};
  let streetNumber = '';
  let route = '';

  components.forEach(component => {
    const types = component.types;
    
    // ZIP CODE EXTRACTION - Key requirement
    if (types.includes('postal_code')) {
      result.zipCode = component.long_name; // Extracts full ZIP code including ZIP+4
    }
    // COUNTRY EXCLUSION - Explicitly ignore country
    else if (types.includes('country')) {
      // INTENTIONALLY IGNORED - USA is excluded from form population
      console.log('Country excluded:', component.long_name);
    }
    // FIELD DISTRIBUTION - Map to specific input boxes
    else if (types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (types.includes('route')) {
      route = component.long_name;
    } else if (types.includes('locality')) {
      result.city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      result.state = component.short_name; // State abbreviation (IL, CA, etc.)
    }
  });

  // Combine street components for Address 1 field
  const streetAddress = `${streetNumber} ${route}`.trim();
  result.streetAddress = streetAddress ? expandAddressAbbreviations(streetAddress) : '';
  
  return {
    streetAddress: result.streetAddress || '',
    city: result.city || '',
    state: result.state || '',
    zipCode: result.zipCode || ''
  };
};

export const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  placeholder = "Enter your street address",
  onAddressSelect,
  className,
  value,
  onChange
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const initializeAutocomplete = () => {
      if (!window.google || !inputRef.current) {
        setTimeout(initializeAutocomplete, 100);
        return;
      }

      try {
        // Configure autocomplete to restrict to US addresses only
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],                     // Only address suggestions
          componentRestrictions: { country: 'US' }, // USA RESTRICTION
          fields: ['formatted_address', 'address_components', 'geometry', 'place_id']
        });

        // Handle place selection
        autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
        
        setIsLoading(false);
        setHasError(false);
      } catch (error) {
        console.error('Failed to initialize Google Places Autocomplete:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    // Add CSS styles for Google Places autocomplete dropdown
    const addGooglePlacesStyles = () => {
      const existingStyle = document.getElementById('google-places-styles');
      if (existingStyle) return;

      const style = document.createElement('style');
      style.id = 'google-places-styles';
      style.textContent = `
        .pac-container {
          z-index: 9999 !important;
          background: white !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
          margin-top: 4px !important;
        }
        .pac-item {
          padding: 8px 12px !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
          cursor: pointer !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
        }
        .pac-item:hover {
          background-color: hsl(var(--accent)) !important;
        }
        .pac-item-selected {
          background-color: hsl(var(--accent)) !important;
        }
        .pac-item:last-child {
          border-bottom: none !important;
        }
        .pac-matched {
          font-weight: 600 !important;
          color: hsl(var(--foreground)) !important;
        }
      `;
      document.head.appendChild(style);
    };

    initializeAutocomplete();
    addGooglePlacesStyles();

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const handlePlaceSelect = () => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();
    if (!place.address_components) {
      console.warn('No address components found in selected place');
      return;
    }

    console.log('Processing selected place:', place);

    // Parse address components with explicit ZIP code extraction and country exclusion
    const addressComponents = parseAddressComponents(place.address_components);
    
    console.log('Parsed address components:', addressComponents);

    // Override the input value to show only street address (not full formatted address)
    if (inputRef.current && addressComponents.streetAddress) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.value = addressComponents.streetAddress;
          onChange?.(addressComponents.streetAddress);
        }
      }, 0);
    }

    // Distribute to proper form fields
    onAddressSelect(addressComponents);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  if (hasError) {
    // Fallback to regular input if Google Maps fails
    return (
      <Input
        ref={inputRef}
        placeholder={placeholder}
        className={className}
        value={value}
        onChange={handleInputChange}
      />
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        placeholder={isLoading ? "Loading address suggestions..." : placeholder}
        className={`${className} ${isLoading ? 'pr-10' : ''} google-places-input`}
        disabled={isLoading}
        value={value}
        onChange={handleInputChange}
      />
      {isLoading && (
        <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
      )}
    </div>
  );
};