import { useJsApiLoader, Libraries } from '@react-google-maps/api';
import { createContext, useContext } from 'react';

const libraries = ['places'];

const GoogleMapsContext = createContext({ isLoaded: false, loadError: null });

export function GoogleMapsProvider({ children }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'orthoconnect-google-maps',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_KEY || '',
    libraries,
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps() {
  return useContext(GoogleMapsContext);
}
