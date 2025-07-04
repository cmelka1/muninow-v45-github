import type { AddressComponents } from '@/components/ui/google-places-autocomplete';

export interface StandardizedAddress {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  formattedAddress: string;
}

export class GoogleMapsService {
  /**
   * Standardizes address components from Google Places API
   */
  static standardizeAddress(components: AddressComponents): StandardizedAddress {
    // Build street address from components
    let streetAddress = '';
    if (components.streetNumber && components.route) {
      streetAddress = `${components.streetNumber} ${this.expandStreetAbbreviations(components.route)}`;
    } else if (components.route) {
      streetAddress = this.expandStreetAbbreviations(components.route);
    } else if (components.streetNumber) {
      streetAddress = components.streetNumber;
    }

    return {
      streetAddress: streetAddress || '',
      city: components.locality || '',
      state: components.administrativeAreaLevel1 || '',
      zipCode: components.postalCode || '',
      formattedAddress: components.formattedAddress
    };
  }

  /**
   * Expands common street abbreviations
   */
  private static expandStreetAbbreviations(street: string): string {
    const abbreviations: Record<string, string> = {
      'St': 'Street',
      'Ave': 'Avenue', 
      'Blvd': 'Boulevard',
      'Dr': 'Drive',
      'Rd': 'Road',
      'Ln': 'Lane',
      'Ct': 'Court',
      'Pl': 'Place',
      'Cir': 'Circle',
      'Pkwy': 'Parkway',
      'Hwy': 'Highway',
      'N': 'North',
      'S': 'South',
      'E': 'East',
      'W': 'West',
      'NE': 'Northeast',
      'NW': 'Northwest', 
      'SE': 'Southeast',
      'SW': 'Southwest'
    };

    let expandedStreet = street;
    
    // Handle abbreviations at the end of street names
    Object.entries(abbreviations).forEach(([abbrev, full]) => {
      const regex = new RegExp(`\\b${abbrev}\\b$`, 'i');
      expandedStreet = expandedStreet.replace(regex, full);
    });

    // Handle directional abbreviations at the beginning
    Object.entries(abbreviations).forEach(([abbrev, full]) => {
      if (['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'].includes(abbrev)) {
        const regex = new RegExp(`^${abbrev}\\b`, 'i');
        expandedStreet = expandedStreet.replace(regex, full);
      }
    });

    return expandedStreet;
  }

  /**
   * Validates if an address appears to be complete
   */
  static isAddressComplete(address: StandardizedAddress): boolean {
    return !!(
      address.streetAddress.trim() &&
      address.city.trim() &&
      address.state.trim() &&
      address.zipCode.trim()
    );
  }

  /**
   * Formats address for display
   */
  static formatAddressForDisplay(address: StandardizedAddress): string {
    const parts = [
      address.streetAddress,
      address.city,
      address.state,
      address.zipCode
    ].filter(part => part.trim());

    if (parts.length >= 4) {
      return `${parts[0]}, ${parts[1]}, ${parts[2]} ${parts[3]}`;
    }
    return parts.join(', ');
  }
}