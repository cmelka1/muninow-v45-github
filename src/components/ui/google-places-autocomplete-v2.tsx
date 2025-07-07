import React, { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';

interface AddressComponents {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

interface GooglePlacesAutocompleteV2Props {
  placeholder?: string;
  onAddressSelect: (addressComponents: AddressComponents) => void;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

// Street abbreviation expansion
const expandStreetAbbreviations = (street: string): string => {
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
};

const parseAddressComponents = (place: any): AddressComponents => {
  const components = place.address_components || [];
  const result: Partial<AddressComponents> = {};
  let streetNumber = '';
  let route = '';

  components.forEach((component: any) => {
    const types = component.types;
    
    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (types.includes('route')) {
      route = component.long_name;
    } else if (types.includes('locality')) {
      result.city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      result.state = component.short_name; // State abbreviation (IL, CA, etc.)
    } else if (types.includes('postal_code')) {
      // Extract only 5-digit ZIP code (remove ZIP+4)
      result.zipCode = component.long_name.split('-')[0];
    }
  });

  // Combine and expand street components
  const expandedRoute = route ? expandStreetAbbreviations(route) : '';
  result.streetAddress = `${streetNumber} ${expandedRoute}`.trim();
  
  return {
    streetAddress: result.streetAddress || '',
    city: result.city || '',
    state: result.state || '',
    zipCode: result.zipCode || ''
  };
};

export const GooglePlacesAutocompleteV2: React.FC<GooglePlacesAutocompleteV2Props> = ({
  placeholder = "Enter your street address",
  onAddressSelect,
  className,
  value,
  onChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [hasError, setHasError] = useState(false);
  const { isLoaded, isLoading, error, loadPlacesLibrary } = useGoogleMapsLoader();

  useEffect(() => {
    if (!isLoaded || hasError) return;

    const initializeAutocomplete = async () => {
      try {
        const { PlaceAutocompleteElement } = await loadPlacesLibrary();
        
        if (!containerRef.current) return;

        // Clear any existing autocomplete
        if (autocompleteRef.current) {
          autocompleteRef.current.remove();
        }

        // Create new PlaceAutocompleteElement
        const autocomplete = new PlaceAutocompleteElement({
          componentRestrictions: { country: 'US' },
          types: ['address'],
          fields: ['address_components', 'formatted_address']
        });

        // Style the element
        autocomplete.style.width = '100%';
        autocomplete.style.height = '44px'; // Match our Input height
        autocomplete.style.border = '1px solid hsl(var(--border))';
        autocomplete.style.borderRadius = '8px';
        autocomplete.style.padding = '8px 12px';
        autocomplete.style.fontSize = '14px';
        autocomplete.style.backgroundColor = 'hsl(var(--background))';
        autocomplete.style.color = 'hsl(var(--foreground))';

        // Set placeholder
        autocomplete.placeholder = placeholder;

        // Set initial value if provided
        if (value) {
          autocomplete.value = value;
        }

        // Handle place selection
        autocomplete.addEventListener('gmp-placeselect', (event: any) => {
          const place = event.place;
          
          if (!place.address_components) {
            return;
          }

          const addressComponents = parseAddressComponents(place);

          // Update the input value to show only street address
          if (addressComponents.streetAddress) {
            autocomplete.value = addressComponents.streetAddress;
            onChange?.(addressComponents.streetAddress);
          }

          // Distribute to form fields
          onAddressSelect(addressComponents);
        });

        // Handle input changes
        autocomplete.addEventListener('input', (event: any) => {
          onChange?.(event.target.value);
        });

        // Append to container
        containerRef.current.appendChild(autocomplete);
        autocompleteRef.current = autocomplete;

        setHasError(false);
      } catch (error) {
        setHasError(true);
      }
    };

    initializeAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        autocompleteRef.current.remove();
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, placeholder, onAddressSelect, onChange]);

  // Update value when prop changes
  useEffect(() => {
    if (autocompleteRef.current && value !== undefined) {
      autocompleteRef.current.value = value;
    }
  }, [value]);

  if (error || hasError) {
    // Fallback to regular input if Google Maps fails
    return (
      <Input
        placeholder={placeholder}
        className={className}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="relative">
        <Input
          placeholder="Loading address suggestions..."
          className={`${className} pr-10`}
          disabled={true}
        />
        <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative ${className || ''}`}
      style={{ minHeight: '44px' }}
    />
  );
};