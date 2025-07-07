import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useRestPlacesAutocomplete } from '@/hooks/useRestPlacesAutocomplete';
import { useGeolocation } from '@/hooks/useGeolocation';

interface AddressComponents {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

interface RestPlacesAutocompleteProps {
  placeholder?: string;
  onAddressSelect: (addressComponents: AddressComponents) => void;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  regionCode?: string;
  includedRegionCodes?: string[];
}

export const RestPlacesAutocomplete: React.FC<RestPlacesAutocompleteProps> = ({
  placeholder = "Enter your street address",
  onAddressSelect,
  className,
  value,
  onChange,
  regionCode = 'US',
  includedRegionCodes = ['US']
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get user's geolocation for better autocomplete results
  const { latitude, longitude, error: geoError } = useGeolocation();

  // Prepare location bias if coordinates are available
  const locationBias = latitude && longitude ? {
    circle: {
      center: { latitude, longitude },
      radius: 50000 // 50km radius
    }
  } : undefined;

  const {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    getPlaceDetails,
    clearSuggestions
  } = useRestPlacesAutocomplete({
    regionCode,
    includedRegionCodes,
    includedPrimaryTypes: ['premise', 'street_address'],
    locationBias
  });

  // Update input value when prop changes
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
    
    if (newValue.trim()) {
      fetchSuggestions(newValue);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } else {
      clearSuggestions();
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (placeId: string, text: string) => {
    setInputValue(text);
    onChange?.(text);
    setShowSuggestions(false);
    clearSuggestions();

    // Get full address details
    const addressComponents = await getPlaceDetails(placeId);
    if (addressComponents) {
      // Update input to show only street address
      if (addressComponents.streetAddress) {
        setInputValue(addressComponents.streetAddress);
        onChange?.(addressComponents.streetAddress);
      }
      onAddressSelect(addressComponents);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const suggestion = suggestions[selectedIndex];
          handleSuggestionSelect(suggestion.placeId, suggestion.text);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        clearSuggestions();
        break;
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          className={className}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || error) && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {error ? (
            <div className="p-3 text-sm text-destructive">
              Error loading suggestions: {error}
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={suggestion.placeId}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted focus:bg-muted focus:outline-none ${
                  index === selectedIndex ? 'bg-muted' : ''
                }`}
                onClick={() => handleSuggestionSelect(suggestion.placeId, suggestion.text)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {suggestion.text}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};