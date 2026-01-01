import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useState, useCallback } from 'react';
import { useGoogleMaps } from './GoogleMapsProvider';
import { MapPin } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '16px',
};

const defaultCenter = {
  lat: 20.5937, // India center
  lng: 78.9629,
};

export function LocationMap({ 
  locations = [], 
  zoom = 12,
  showInfoWindow = true,
  className = "",
}) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedMarker, setSelectedMarker] = useState(null);

  const onMarkerClick = useCallback((location) => {
    setSelectedMarker(location);
  }, []);

  const onInfoWindowClose = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  // Calculate center based on locations
  const center = locations.length > 0 && locations[0].geo
    ? {
        lat: locations[0].geo.coordinates[1],
        lng: locations[0].geo.coordinates[0],
      }
    : defaultCenter;

  if (loadError) {
    return (
      <div className={`rounded-2xl bg-slate-100 p-6 text-center ${className}`}>
        <MapPin className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-2 text-sm text-slate-600">Unable to load map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`animate-pulse rounded-2xl bg-slate-200 ${className}`} style={{ height: '300px' }}>
        <div className="flex h-full items-center justify-center">
          <MapPin className="h-8 w-8 text-slate-400" />
        </div>
      </div>
    );
  }

  // Filter locations with valid coordinates
  const validLocations = locations.filter(loc => 
    loc.geo?.coordinates && 
    loc.geo.coordinates.length === 2 &&
    !isNaN(loc.geo.coordinates[0]) &&
    !isNaN(loc.geo.coordinates[1])
  );

  if (validLocations.length === 0) {
    return (
      <div className={`rounded-2xl bg-slate-100 p-6 text-center ${className}`}>
        <MapPin className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-2 text-sm text-slate-600">Location not available on map</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        }}
      >
        {validLocations.map((location, index) => (
          <Marker
            key={location.id || index}
            position={{
              lat: location.geo.coordinates[1],
              lng: location.geo.coordinates[0],
            }}
            onClick={() => onMarkerClick(location)}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                  <path fill="#0d9488" d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z"/>
                  <circle fill="#ffffff" cx="16" cy="16" r="8"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(32, 40),
              anchor: new window.google.maps.Point(16, 40),
            }}
          />
        ))}

        {showInfoWindow && selectedMarker && (
          <InfoWindow
            position={{
              lat: selectedMarker.geo.coordinates[1],
              lng: selectedMarker.geo.coordinates[0],
            }}
            onCloseClick={onInfoWindowClose}
          >
            <div className="p-2 max-w-[200px]">
              <div className="font-semibold text-slate-900">
                {selectedMarker.facility_name || 'Clinic Location'}
              </div>
              {selectedMarker.address && (
                <div className="mt-1 text-xs text-slate-600">{selectedMarker.address}</div>
              )}
              {selectedMarker.city && (
                <div className="mt-1 text-xs text-slate-500">
                  {selectedMarker.city}{selectedMarker.pincode ? `, ${selectedMarker.pincode}` : ''}
                </div>
              )}
              {selectedMarker.phone && (
                <a 
                  href={`tel:${selectedMarker.phone}`}
                  className="mt-2 inline-block text-xs text-teal-600 hover:underline"
                >
                  📞 {selectedMarker.phone}
                </a>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
