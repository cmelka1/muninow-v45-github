import React, { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { cn } from '@/lib/utils';

export interface AddressComponents {
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeAreaLevel1?: string;
  postalCode?: string;
  country?: string;
  formattedAddress: string;
}

interface GooglePlacesAutocompleteProps {
  onAddressSelect: (address: AddressComponents) => void;
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  onAddressSelect,
  placeholder = "Start typing your address...",
  className,
  value,
  onChange
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const { isLoaded, isLoading, error } = useGoogleMaps();
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
      // Initialize the autocomplete
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'formatted_address', 'geometry']
        }
      );

      // Add place selection listener
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        
        if (!place || !place.address_components) {
          return;
        }

        const addressComponents: AddressComponents = {
          formattedAddress: place.formatted_address || ''
        };

        // Parse address components
        place.address_components.forEach((component: any) => {
          const types = component.types;
          
          if (types.includes('street_number')) {
            addressComponents.streetNumber = component.long_name;
          } else if (types.includes('route')) {
            addressComponents.route = component.long_name;
          } else if (types.includes('locality')) {
            addressComponents.locality = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            addressComponents.administrativeAreaLevel1 = component.short_name;
          } else if (types.includes('postal_code')) {
            addressComponents.postalCode = component.long_name;
          } else if (types.includes('country')) {
            addressComponents.country = component.long_name;
          }
        });

        setInputValue(addressComponents.formattedAddress);
        onAddressSelect(addressComponents);
      });
    }

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onAddressSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
  };

  if (error) {
    return (
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter your address manually"
          className={cn("h-11", className)}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Address autocomplete unavailable. Please enter manually.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        placeholder={isLoading ? "Loading address suggestions..." : placeholder}
        className={cn("h-11 pr-10", className)}
        disabled={isLoading}
      />
      {isLoading && (
        <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
      )}
    </div>
  );
};