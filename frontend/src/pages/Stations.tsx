import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { useStations, useNearbyCollectorsMap } from "../api/queries";
import { Card, CenterLoading, TopBar } from "../components/ui";
import "leaflet/dist/leaflet.css";

const stationIcon = new L.DivIcon({
  html: `<div style="background:#16a34a;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3)"><span style="transform:rotate(45deg);font-size:13px">♻️</span></div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const collectorIcon = new L.DivIcon({
  html: `<div style="background:#2563eb;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3)"><span style="transform:rotate(45deg);font-size:13px">🚚</span></div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const YASUJ_CENTER: [number, number] = [30.6683, 51.5877];

export default function Stations() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const { data: stations, isLoading } = useStations(coords);
  const { data: collectors } = useNearbyCollectorsMap(coords);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 4000 }
    );
  }, []);

  return (
    <div>
      <TopBar title="ایستگاه‌های بازیافت" subtitle="نزدیک‌ترین مراکز بازیافت را ببینید" />

      <div className="px-4 mb-4">
        <Card className="overflow-hidden h-56">
          <MapContainer center={YASUJ_CENTER} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {(stations || []).map(
              (s) =>
                s.lat &&
                s.lng && (
                  <Marker key={s.uid} position={[Number(s.lat), Number(s.lng)]} icon={stationIcon}>
                    <Popup>
                      <b>{s.name}</b>
                      <br />
                      {s.address}
                    </Popup>
                  </Marker>
                )
            )}
            {(collectors || []).map((c) => {
              const lat = Number(c.lat);
              const lng = Number(c.lng);
              if (!c.lat || !c.lng || Number.isNaN(lat) || Number.isNaN(lng)) return null;
              return (
                <Marker key={c.id} position={[lat, lng]} icon={collectorIcon}>
                  <Popup>
                    <b>{c.name}</b>
                    <br />
                    ⭐ {c.rating_avg}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </Card>
        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-[11px] text-ink-500">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#16a34a" }} />
            ایستگاه‌ها
          </span>
          <span className="flex items-center gap-1 text-[11px] text-ink-500">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#2563eb" }} />
            جمع‌آورها
          </span>
        </div>
      </div>

      <div className="px-4">
        {isLoading ? (
          <CenterLoading />
        ) : (
          <div className="flex flex-col gap-3">
            {(stations || []).map((s) => (
              <Card key={s.uid} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-sm text-ink-900">{s.name}</p>
                    <p className="text-xs text-ink-500 mt-1">{s.address}</p>
                    <p className="text-xs text-ink-500 mt-1">⏰ {s.working_hours}</p>
                  </div>
                  {s.distance_km !== undefined && (
                    <span className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-lg whitespace-nowrap">
                      {s.distance_km.toFixed(1)} کیلومتر
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {s.accepted_materials.slice(0, 5).map((m) => (
                    <span key={m.id} className="text-[10px] bg-slate-100 text-ink-700 px-2 py-1 rounded-full">
                      {m.name}
                    </span>
                  ))}
                </div>
                {s.phone_number && (
                  <a href={`tel:${s.phone_number}`} className="text-brand-600 text-xs font-medium mt-3 inline-block">
                    📞 تماس با ایستگاه
                  </a>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
