import { useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const YASUJ_CENTER: [number, number] = [30.6683, 51.5877];
// محدودهٔ شهر یاسوج: نقشه بیرون از این محدوده کشیده نمی‌شود و نقطه‌ی بیرون آن پذیرفته نمی‌شود.
const YASUJ_BOUNDS: [[number, number], [number, number]] = [[30.60, 51.50], [30.74, 51.68]];
const inYasuj = (la: number, ln: number) =>
  la >= YASUJ_BOUNDS[0][0] && la <= YASUJ_BOUNDS[1][0] && ln >= YASUJ_BOUNDS[0][1] && ln <= YASUJ_BOUNDS[1][1];

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
  const [notice, setNotice] = useState("");

  // نقطهٔ بیرون از یاسوج (کلیک، کشیدن پین یا GPS) رد می‌شود و پیام روشن می‌دهد.
  function pick(la: number, ln: number) {
    if (!inYasuj(la, ln)) {
      setNotice("فعلاً فقط داخل شهر یاسوج سرویس می‌دهیم؛ نقطه‌ای داخل شهر انتخاب کن.");
      return;
    }
    setNotice("");
    onChange(la, ln);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setNotice("موقعیت‌یاب این دستگاه در دسترس نیست.");
    navigator.geolocation.getCurrentPosition(
      (pos) => pick(pos.coords.latitude, pos.coords.longitude),
      () => setNotice("موقعیت شما پیدا نشد؛ اجازهٔ موقعیت را بررسی کن یا پین را روی نقشه بگذار."),
      { timeout: 6000 }
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-brand-100 relative" style={{ height }}>
      <MapContainer center={position} zoom={15} minZoom={12} maxBounds={YASUJ_BOUNDS} maxBoundsViscosity={1} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onPick={pick} />
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
                if (inYasuj(p.lat, p.lng)) onChange(p.lat, p.lng);
                else {
                  setNotice("فعلاً فقط داخل شهر یاسوج سرویس می‌دهیم.");
                  m.setLatLng(position);
                }
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
      {notice && (
        <div className="absolute top-2 inset-x-2 bg-amber-50 text-amber-800 text-[11px] rounded-lg px-2.5 py-1.5 z-[1000] shadow">{notice}</div>
      )}
    </div>
  );
}
