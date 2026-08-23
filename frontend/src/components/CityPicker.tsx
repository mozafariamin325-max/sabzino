import { useMemo, useState } from "react";
import { useAllCities } from "../api/queries";
import { CenterLoading } from "./ui";

/**
 * فاز ۱۵: انتخاب‌گر شهر با جستجو — برای هر دو مسیر استفاده می‌شود: تکمیل
 * پروفایل کاربر جدید (CompleteProfileModal) و انتخاب شهر در حالت مهمان
 * (AuthScreen). فهرست از همان API واقعی locations/cities می‌آید (نه mock)
 * که همهٔ شهرهای کهگیلویه‌وبویراحمد (یاسوج، دوگنبدان/گچساران، دهدشت،
 * سی‌سخت، لیکک، چرام، باشت، لنده) + تهران/شیراز/اصفهان را شامل می‌شود.
 */
export default function CityPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const { data: cities, isLoading } = useAllCities();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!cities) return [];
    const query = q.trim();
    if (!query) return cities;
    return cities.filter((c) => c.name.includes(query));
  }, [cities, q]);

  return (
    <div>
      <input
        className="w-full rounded-xl border border-brand-100 px-3 py-2.5 text-sm mb-2.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
        placeholder="جستجوی شهر (یاسوج، گچساران، تهران...)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {isLoading ? (
        <CenterLoading />
      ) : (
        <div className="max-h-56 overflow-y-auto grid grid-cols-3 gap-2 pl-1">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.name)}
              className={`rounded-xl px-2 py-2.5 text-center border transition ${
                value === c.name ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200" : "border-brand-100 bg-white"
              }`}
            >
              <span className="text-lg block">{c.landmark_icon || "🏙️"}</span>
              <span className="text-[11px] font-medium text-ink-800 block mt-1">{c.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-3 text-center text-xs text-ink-400 py-4">شهری یافت نشد.</p>
          )}
        </div>
      )}
    </div>
  );
}
