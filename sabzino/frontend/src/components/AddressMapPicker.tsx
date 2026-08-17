import { useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const YASUJ_CENTER: [number, number] = [30.6683, 51.5877];

const pinIcon = new L.DivIcon({
  html: `<div style="background:#16a34a;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.35)"><span style="transform:rotate(45deg);font-size:14px">📍</span></div>`,
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Free OpenStreetMap-based picker (no API key / no card required). Tap
 * anywhere on the map or drag the pin to set the exact lat/lng for an
 * address — used by the address book + request wizard.
 */
export default function AddressMapPicker({
  lat,
  lng,
  onChange,
  height = 220,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}) {
  const position = useMemo<[number, number]>(() => (lat && lng ? [lat, lng] : YASUJ_CENTER), [lat, lng]);
  const markerRef = useRef<L.Marker | null>(null);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { timeout: 5000 }
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-brand-100 relative" style={{ height }}>
      <MapContainer center={position} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onPick={onChange} />
        <Marker
          position={position}
          icon={pinIcon}
          draggable
          ref={markerRef}
          eventHandlers={{
            dragend: () => {
              const m = markerRef.current;
              if (m) {
                const p = m.getLatLng();
                onChange(p.lat, p.lng);
              }
            },
          }}
        />
      </MapContainer>
      <button
        type="button"
        onClick={useMyLocation}
        className="absolute bottom-2 left-2 bg-white shadow rounded-lg px-3 py-1.5 text-xs font-medium text-brand-700 z-[1000]"
      >
        📍 موقعیت من
      </button>
    </div>
  );
}
