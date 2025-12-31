import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

// Fix default marker icons for Leaflet in CRA
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function ResultsMap({ results, activeSlug, onMarkerHover }) {
  const points = useMemo(() => {
    return (results || [])
      .map((r) => {
        const geo = r?.clinic?.geo;
        if (!geo?.coordinates || geo.coordinates.length !== 2) return null;
        const [lng, lat] = geo.coordinates;
        return { ...r, lat, lng };
      })
      .filter(Boolean);
  }, [results]);

  useEffect(() => {
    // noop - placeholder for any side effects
  }, [activeSlug]);

  const center = points.length
    ? [points[0].lat, points[0].lng]
    : [20.5937, 78.9629]; // India

  return (
    <div
      data-testid="search-results-map"
      className="h-[520px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <MapContainer
        center={center}
        zoom={points.length ? 12 : 4}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            eventHandlers={{
              mouseover: () => onMarkerHover?.(p.slug),
              mouseout: () => onMarkerHover?.(null),
            }}
          >
            <Popup>
              <div data-testid={`map-popup-${p.slug}`} className="space-y-1">
                <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                <div className="text-xs text-slate-600">{p.qualifications}</div>
                <div className="text-xs text-slate-500">
                  {p.clinic?.city} {p.clinic?.pincode ? `· ${p.clinic.pincode}` : ""}
                </div>
                <Link
                  data-testid={`map-popup-link-${p.slug}`}
                  to={`/doctor/${p.slug}`}
                  className="text-xs font-medium text-sky-700 hover:text-sky-800 transition-colors"
                >
                  View profile
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
