import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from './GoogleMapsProvider';
import { Input } from '@/components/ui/input';

export function AddressAutocomplete({ 
  value, 
  onChange, 
  onPlaceSelect,
  placeholder = "Start typing address...",
  className = "",
  ...props 
}) {
  const { isLoaded } = useGoogleMaps();
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    // Initialize autocomplete
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        componentRestrictions: { country: 'in' }, // Restrict to India
        fields: ['address_components', 'geometry', 'formatted_address', 'name'],
        types: ['establishment', 'geocode'],
      }
    );

    // Add listener for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      
      if (!place.geometry) {
        return;
      }

      // Extract address components
      const addressComponents = place.address_components || [];
      let city = '';
      let pincode = '';
      let state = '';

      addressComponents.forEach((component) => {
        if (component.types.includes('locality')) {
          city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
        if (component.types.includes('postal_code')) {
          pincode = component.long_name;
        }
      });

      const result = {
        address: place.formatted_address || '',
        city: city,
        pincode: pincode,
        state: state,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        facilityName: place.name || '',
      };

      setInputValue(place.formatted_address || '');
      onChange?.(place.formatted_address || '');
      onPlaceSelect?.(result);
    });

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange, onPlaceSelect]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    onChange?.(e.target.value);
  };

  if (!isLoaded) {
    return (
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        {...props}
      />
    );
  }

  return (
    <Input
      ref={inputRef}
      value={inputValue}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  );
}
