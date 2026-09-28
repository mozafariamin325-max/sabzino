import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAddresses, useCreateAddress, useCreateRequest, useCreateRecurringSchedule,
  useMaterialCategories, useAllCities,
} from "../api/queries";
import { WEEKDAY_LABELS, type Address } from "../api/types";
import { Button, Card, CenterLoading, TopBar } from "../components/ui";
import { formatToman, toJalaliTime } from "../lib/format";
import AddressMapPicker from "../components/AddressMapPicker";
import RequestSuccessModal from "../components/RequestSuccessModal";
import { useAuthStore } from "../store/auth";
import { clearDraft, loadDraft, saveDraft } from "../lib/wizardDraft";
import { digitsOnly } from "../lib/digits";

const STEPS = ["مواد و وزن", "آدرس", "زمان‌بندی", "توضیحات", "تأیید"];
const YASUJ_CENTER = { lat: 30.6683, lng: 51.5877 };
const MAX_WEIGHT_KG = 200;
// هشدار فوری سمت کلاینت اگر نقطهٔ انتخابی روی نقشه خیلی از مرکز شهر کاربر
// دور باشد. فقط برای راهنمایی آنی است؛ تصمیم نهایی (رد/قبول) همیشه با
// اعتبارسنجی بک‌اند است (core/geo.py، City.service_radius_km).
const OUT_OF_AREA_WARN_KM = 30;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// فاز ۱۴: بازه‌های ساعتی تقریبی برای جمع‌آوری دوره‌ای — به‌جای یک عدد ساعت
// دقیق («۹»)، شهروند یک بازهٔ یک‌ساعته انتخاب می‌کند (مثلاً «۹ تا ۱۰»)؛
// مقدار ذخیره‌شده همچنان ابتدای بازه است (سازگار با فیلد فعلی preferred_hour).
const HOUR_RANGES = Array.from({ length: 22 - 6 }, (_, i) => 6 + i).map((h) => ({
  value: h,
  label: `${h} تا ${h + 1}`,
}));

type ItemState = { weightKg: number; isExact: boolean };

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i); // ۸ تا ۲۱ (بازهٔ یک‌ساعته)
const pad2 = (n: number) => String(n).padStart(2, "0");
const toLocalISO = (d: Date, h: number) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(h)}:00`;
const faNum = (n: number) => n.toLocaleString("fa-IR");
const dayLabel = (d: Date, i: number) =>
  i === 0 ? "امروز" : i === 1 ? "فردا" : new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "short", day: "numeric", month: "short" }).format(d);

export default function RequestWizard() {
  const navigate = useNavigate();
  // فاز ۱۹: پیش‌نویس ذخیره‌شدهٔ مهمان (اگر برای ورود از ویزارد خارج شده بود).
  const [draft] = useState(() => loadDraft());
  const [step, setStep] = useState(draft?.step ?? 0);
  const [q, setQ] = useState("");
  const [openCat, setOpenCat] = useState<number | null>(null);
  const { data: categories, isLoading } = useMaterialCategories();
  const { data: addresses } = useAddresses();
  const { data: allCities } = useAllCities();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const guestCity = useAuthStore((s) => s.guestCity);
  const createAddress = useCreateAddress();
  const createRequest = useCreateRequest();
  const createSchedule = useCreateRecurringSchedule();

  // شهر ثبت‌نامی کاربر — نقشهٔ انتخاب آدرس باید روی همین شهر باز شود، نه
  // همیشه یاسوج (باگ قبلی: کاربر شیراز هم نقشه را از یاسوج می‌دید). اگر
  // مختصات شهر کاربر در دیتابیس نبود، به یاسوج برمی‌گردیم تا نقشه هرگز
  // خالی/نامعتبر نماند.
  const activeCityName = user?.city || guestCity || null;
  const cityCenter = useMemo(() => {
    if (activeCityName && allCities) {
      const match = allCities.find((c) => c.name === activeCityName);
      if (match?.lat && match?.lng) return { lat: Number(match.lat), lng: Number(match.lng) };
    }
    return YASUJ_CENTER;
  }, [activeCityName, allCities]);

  const [items, setItems] = useState<Record<number, ItemState>>(draft?.items ?? {});
  const [addressId, setAddressId] = useState<number | null>(null);
  const [addingNewAddress, setAddingNewAddress] = useState(!!draft?.newAddress);
  const [newAddressTitle, setNewAddressTitle] = useState(draft?.newAddressTitle ?? "آدرس جدید");
  const [newAddress, setNewAddress] = useState(draft?.newAddress ?? "");
  const [newLat, setNewLat] = useState<number | null>(draft?.newLat ?? null);
  const [newLng, setNewLng] = useState<number | null>(draft?.newLng ?? null);

  const [scheduleMode, setScheduleMode] = useState<"ONCE" | "RECURRING">(draft?.scheduleMode ?? "ONCE");
  const [preferredTime, setPreferredTime] = useState(draft?.preferredTime ?? "");
  // فقط از حداقل دو ساعت بعد تا ۷ روز آینده، ساعت ۸ تا ۲۱ (نه گذشته، نه نیمه‌شب)
  const days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      return d;
    });
  }, []);
  const earliestMs = useMemo(() => Date.now() + 2 * 3600 * 1000, []);
  const slotOk = (d: Date, h: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).getTime() >= earliestMs;
  const [pickDay, setPickDay] = useState<number | null>(() => {
    const t = draft?.preferredTime;
    if (!t) return null;
    const i = days.findIndex((d) => toLocalISO(d, 0).slice(0, 10) === t.slice(0, 10));
    return i >= 0 ? i : null;
  });
  const [pickHour, setPickHour] = useState<number | null>(() => {
    const t = draft?.preferredTime;
    const h = t ? Number(t.slice(11, 13)) : NaN;
    return Number.isFinite(h) ? h : null;
  });
  useEffect(() => {
    if (pickDay === null || pickHour === null || !slotOk(days[pickDay], pickHour)) {
      setPreferredTime("");
      return;
    }
    setPreferredTime(toLocalISO(days[pickDay], pickHour));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickDay, pickHour]);
  const [frequency, setFrequency] = useState<"WEEKLY" | "BIWEEKLY" | "MONTHLY">(draft?.frequency ?? "WEEKLY");
  const [dayOfWeek, setDayOfWeek] = useState(draft?.dayOfWeek ?? 6);
  const [dayOfMonth, setDayOfMonth] = useState(draft?.dayOfMonth ?? 1);
  // فاز ۱۴: عمداً به‌جای مقدار پیش‌فرض، null است — شهروند باید خودش یک بازه
  // ساعتی را صراحتاً انتخاب کند تا بتوان ادامه داد (رفع ابهام «چه زمانی؟»).
  const [preferredHour, setPreferredHour] = useState<number | null>(draft?.preferredHour ?? null);

  const [description, setDescription] = useState(draft?.description ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [greenIntent, setGreenIntent] = useState<"SELL" | "DONATE">(draft?.greenIntent ?? "SELL");
  const [geocoding, setGeocoding] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    estimatedValue: number; estimatedPoints: number; requestUid?: string; recurring: boolean;
  } | null>(null);

  async function handleMapChange(la: number, ln: number) {
    setNewLat(la);
    setNewLng(ln);
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${la}&lon=${ln}&accept-language=fa&zoom=18`
      );
      const data = await res.json();
      if (data?.display_name) setNewAddress(data.display_name);
    } catch {
      /* reverse geocoding is a convenience only — citizen can always type the address manually */
    } finally {
      setGeocoding(false);
    }
  }

  const addressList: Address[] = addresses || [];
  const outOfArea = useMemo(() => {
    if (newLat == null || newLng == null) return false;
    return haversineKm(newLat, newLng, cityCenter.lat, cityCenter.lng) > OUT_OF_AREA_WARN_KM;
  }, [newLat, newLng, cityCenter]);
  // جستجو: اگر عبارت با نام «گروه» بخواند همهٔ اعضای آن گروه، وگرنه فقط مواد مطابق نشان داده می‌شوند.
  const filteredCats = useMemo(() => {
    const term = q.trim();
    return (categories || [])
      .map((cat) => ({
        ...cat,
        materials: !term || cat.name.includes(term) ? cat.materials : cat.materials.filter((m) => m.name.includes(term)),
      }))
      .filter((cat) => cat.materials.length > 0);
  }, [categories, q]);

  const allMaterials = useMemo(() => (categories || []).flatMap((c) => c.materials), [categories]);
  const selectedIds = Object.keys(items).map(Number);
  const selectedMaterialObjs = allMaterials.filter((m) => selectedIds.includes(m.id));

  function toggleMaterial(id: number) {
    setItems((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = { weightKg: 5, isExact: false };
      return next;
    });
  }

  function updateItem(id: number, patch: Partial<ItemState>) {
    setItems((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  const estimatedValue = useMemo(() => {
    let total = 0;
    for (const id of selectedIds) {
      const mat = allMaterials.find((m) => m.id === id);
      if (!mat) continue;
      total += Number(mat.current_price || 0) * (items[id]?.weightKg || 0);
    }
    return Math.round(total);
  }, [items, selectedIds, allMaterials]);

  function canProceed() {
    if (step === 0) return selectedIds.length > 0 && selectedIds.every((id) => items[id].weightKg > 0);
    if (step === 1) return !!addressId || (addingNewAddress && newAddress.trim().length > 5);
    if (step === 2) {
      if (scheduleMode === "ONCE") return !!preferredTime;
      if (preferredHour === null) return false;
      if (frequency === "MONTHLY") return dayOfMonth >= 1 && dayOfMonth <= 28;
      return dayOfWeek >= 0 && dayOfWeek <= 6;
    }
    return true;
  }

  async function resolveAddressId(): Promise<number> {
    if (addressId) return addressId;
    // باگ قبلی: شهر همیشه «یاسوج» ثبت می‌شد حتی برای کاربران شهرهای دیگر —
    // حالا شهر واقعی کاربر ثبت می‌شود (و بک‌اند هم مستقل از این متن، فاصلهٔ
    // مختصات تا مرکز شهر کاربر را اعتبارسنجی می‌کند).
    const created = await createAddress.mutateAsync({
      title: newAddressTitle, full_address: newAddress, city: activeCityName || "یاسوج",
      lat: String(newLat ?? cityCenter.lat), lng: String(newLng ?? cityCenter.lng), is_default: addressList.length === 0,
    });
    return created.id;
  }

  const autoRan = useRef(false);
  useEffect(() => {
    // مهمان «ثبت نهایی» را زده و ورود کرده؛ درخواست بدون هیچ کلیک دوباره ثبت می‌شود.
    if (accessToken && draft?.autoSubmit && !autoRan.current && categories) {
      autoRan.current = true;
      saveDraft({ ...draft, autoSubmit: false }); // اگر ثبت شکست خورد، دفعهٔ بعد خودکار تکرار نشود
      void handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, categories]);

  async function handleSubmit() {
    // فاز ۱۹: مهمان همهٔ مراحل را پر کرده؛ فقط اینجا (ثبت نهایی) ورود می‌خواهیم.
    // پیش‌نویس ذخیره می‌شود و بعد از ورود، کاربر دقیقاً به همین مرحله برمی‌گردد.
    if (!accessToken) {
      saveDraft({
        step: STEPS.length - 1, items, newAddressTitle, newAddress, newLat, newLng, scheduleMode,
        preferredTime, frequency, dayOfWeek, dayOfMonth, preferredHour, description, greenIntent,
        autoSubmit: true,
      });
      navigate("/login", { state: { from: { pathname: "/requests/new" } } });
      return;
    }
    const finalAddressId = await resolveAddressId();

    if (scheduleMode === "RECURRING") {
      await createSchedule.mutateAsync({
        address: finalAddressId,
        material_ids: selectedIds,
        frequency,
        day_of_week: frequency !== "MONTHLY" ? dayOfWeek : null,
        day_of_month: frequency === "MONTHLY" ? dayOfMonth : null,
        preferred_hour: preferredHour ?? 9,
      });
      // فاز ۱۴: به‌جای رفتن بی‌صدا به لیست درخواست‌ها، صفحهٔ موفقیت نشان
      // داده می‌شود؛ دکمه‌های همان صفحه کاربر را به خانه/لیست هدایت می‌کنند.
      clearDraft();
      setSuccessInfo({ estimatedValue, estimatedPoints: 0, recurring: true });
      return;
    }

    const fd = new FormData();
    fd.append(
      "items_json",
      JSON.stringify(selectedIds.map((id) => ({ material: id, weight_kg: items[id].weightKg, is_exact: items[id].isExact })))
    );
    fd.append("address", String(finalAddressId));
    if (preferredTime) fd.append("preferred_time", new Date(preferredTime).toISOString());
    fd.append("green_intent", greenIntent);
    if (description) fd.append("description", description);
    if (photo) fd.append("photo", photo);

    const res = await createRequest.mutateAsync(fd);
    clearDraft();
    setSuccessInfo({
      estimatedValue, estimatedPoints: res.estimated_points ?? 0, requestUid: res.request.uid, recurring: false,
    });
  }

  const busy = createRequest.isPending || createSchedule.isPending || createAddress.isPending;
  const submitError = (createRequest.error || createSchedule.error) as Error | undefined;

  return (
    <div>
      <TopBar title="ثبت درخواست جمع‌آوری" subtitle={`مرحله ${step + 1} از ${STEPS.length} — ${STEPS[step]}`} />

      <div className="px-4 mb-4">
        <div className="h-1.5 bg-brand-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="px-4 pb-4">
        {step === 0 && (
          <div>
            {isLoading ? (
              <CenterLoading />
            ) : (
              <div className="flex flex-col gap-4">
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="🔍 جستجوی نوع زباله (مثلاً پلاستیک، کارتن، مس)"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-ink-500">گروه را باز کن، چند نوع زباله را هم‌زمان انتخاب کن و برای هرکدام وزن را تنظیم کن.</p>
                {filteredCats.length === 0 && <p className="text-sm text-ink-500 text-center py-6">موردی پیدا نشد.</p>}
                {filteredCats.map((cat) => {
                  const isOpen = !!q.trim() || openCat === cat.id;
                  const selCount = cat.materials.filter((m) => !!items[m.id]).length;
                  return (
                  <div key={cat.id} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenCat(openCat === cat.id ? null : cat.id)}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-right"
                    >
                      <span className="text-sm font-bold text-ink-800">{cat.icon} {cat.name}</span>
                      <span className="flex items-center gap-2 text-xs text-ink-500">
                        {selCount > 0 && <span className="bg-primary text-on-primary rounded-full px-2 py-0.5">{faNum(selCount)}</span>}
                        <span>{isOpen ? "▴" : "▾"}</span>
                      </span>
                    </button>
                    {isOpen && (
                    <div className="flex flex-col gap-2 p-3 pt-0">
                      {cat.materials.map((m) => {
                        const selected = !!items[m.id];
                        return (
                          <div
                            key={m.id}
                            className={`rounded-xl border p-3 text-sm transition ${
                              selected ? "border-brand-500 bg-brand-50" : "border-brand-100 bg-white"
                            }`}
                          >
                            <button type="button" onClick={() => toggleMaterial(m.id)} className="w-full text-right flex items-center justify-between">
                              <span>
                                <p className="font-medium text-ink-900">{m.name}</p>
                                <p className="text-[11px] mt-0.5">
                                  {m.requires_appraisal || !m.current_price ? (
                                    <span className="text-amber-700">قیمت پس از کارشناسی</span>
                                  ) : (
                                    <span className="text-ink-500">{formatToman(m.current_price)} تومان/کیلو</span>
                                  )}
                                </p>
                              </span>
                              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "border-brand-500 bg-brand-500 text-white" : "border-brand-200"}`}>
                                {selected && "✓"}
                              </span>
                            </button>

                            {selected && (
                              <div className="mt-3 pt-3 border-t border-brand-100">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs text-ink-600">وزن تقریبی</span>
                                  <label className="flex items-center gap-1.5 text-[11px] text-ink-600">
                                    <input
                                      type="checkbox"
                                      checked={items[m.id].isExact}
                                      onChange={(e) => updateItem(m.id, { isExact: e.target.checked })}
                                    />
                                    وزن را دقیق می‌دانم
                                  </label>
                                </div>
                                {items[m.id].isExact ? (
                                  <div>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      autoComplete="off"
                                      placeholder="وزن (کیلوگرم)"
                                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                                      dir="ltr"
                                      value={items[m.id].weightKg > 0 ? String(items[m.id].weightKg) : ""}
                                      onChange={(e) => {
                                        // فقط رقم؛ خالی‌کردن و تایپ دوباره آزاد است (قبلاً عدد قفل می‌شد).
                                        const d = digitsOnly(e.target.value, 3);
                                        updateItem(m.id, { weightKg: d === "" ? 0 : Math.min(MAX_WEIGHT_KG, parseInt(d, 10)) });
                                      }}
                                      onBlur={() => { if (!(items[m.id].weightKg > 0)) updateItem(m.id, { weightKg: 1 }); }}
                                    />
                                    <p className="text-[10px] text-ink-400 mt-1">
                                      وزن به کیلوگرم و به‌صورت عدد صحیح (بدون اعشار) — اگر بیشتر از {MAX_WEIGHT_KG} کیلوگرم دارید، همین‌جا وارد کنید، جمع‌آور در محل هماهنگ می‌کند.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="range"
                                      min={1}
                                      max={MAX_WEIGHT_KG}
                                      step={1}
                                      value={items[m.id].weightKg}
                                      onChange={(e) => updateItem(m.id, { weightKg: Number(e.target.value) })}
                                      className="w-full accent-brand-500"
                                    />
                                    <span className="text-xs font-bold text-brand-700 whitespace-nowrap w-16 text-left">
                                      {items[m.id].weightKg} kg
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            {addressList.map((addr) => (
              <button
                key={addr.id}
                onClick={() => {
                  setAddressId(addr.id);
                  setAddingNewAddress(false);
                }}
                className={`text-right rounded-xl p-4 border text-sm ${
                  addressId === addr.id ? "border-brand-500 bg-brand-50" : "border-brand-100 bg-white"
                }`}
              >
                <p className="font-medium">{addr.title}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">{addr.full_address}</p>
              </button>
            ))}
            {!addingNewAddress ? (
              <button
                type="button"
                onClick={() => {
                  setAddingNewAddress(true);
                  setAddressId(null);
                }}
                className="rounded-xl border border-dashed border-brand-300 p-4 text-sm text-brand-600 font-medium"
              >
                + افزودن آدرس جدید روی نقشه
              </button>
            ) : (
              <Card className="p-3 flex flex-col gap-3">
                <AddressMapPicker lat={newLat ?? cityCenter.lat} lng={newLng ?? cityCenter.lng} onChange={handleMapChange} />
                {outOfArea && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    این نقطه خارج از محدودهٔ شهر شما ({activeCityName || "یاسوج"}) به نظر می‌رسد — احتمالاً امکان ثبت این درخواست نیست. لطفاً نقطه‌ای داخل شهر خودتان انتخاب کنید.
                  </p>
                )}
                <input
                  className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
                  placeholder="عنوان آدرس"
                  value={newAddressTitle}
                  onChange={(e) => setNewAddressTitle(e.target.value)}
                />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-ink-500">آدرس (خودکار از روی نقشه — قابل ویرایش)</label>
                    {geocoding && <span className="text-[10.5px] text-brand-600">در حال یافتن آدرس...</span>}
                  </div>
                  <textarea
                    className="w-full rounded-xl border border-brand-100 p-3 text-sm"
                    rows={2}
                    placeholder="با جابه‌جایی پین روی نقشه، آدرس اینجا خودکار نوشته می‌شود؛ در صورت نیاز ویرایش کنید."
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                  />
                </div>
              </Card>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setScheduleMode("ONCE")}
                className={`rounded-xl p-3 border text-sm ${scheduleMode === "ONCE" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-brand-100 bg-white"}`}
              >
                یک‌بار در زمان مشخص
              </button>
              <button
                onClick={() => setScheduleMode("RECURRING")}
                className={`rounded-xl p-3 border text-sm ${scheduleMode === "RECURRING" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-brand-100 bg-white"}`}
              >
                جمع‌آوری دوره‌ای
              </button>
            </div>

            {scheduleMode === "ONCE" ? (
              <div>
                <label className="text-xs text-ink-500 mb-2 block">روز مراجعه <span className="text-red-500">*</span></label>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {days.map((d, i) => {
                    const anyHour = HOURS.some((h) => slotOk(d, h));
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!anyHour}
                        onClick={() => { setPickDay(i); if (pickHour !== null && !slotOk(d, pickHour)) setPickHour(null); }}
                        className={`shrink-0 rounded-2xl border px-3.5 py-2.5 text-xs ${pickDay === i ? "border-primary bg-primary text-on-primary" : "border-slate-200 bg-white text-ink-700"} disabled:opacity-40`}
                      >
                        {dayLabel(d, i)}
                      </button>
                    );
                  })}
                </div>
                <label className="text-xs text-ink-500 mt-3 mb-2 block">ساعت مراجعه <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {HOURS.map((h) => {
                    const ok = pickDay !== null && slotOk(days[pickDay], h);
                    return (
                      <button
                        key={h}
                        type="button"
                        disabled={!ok}
                        onClick={() => setPickHour(h)}
                        className={`rounded-xl border py-2 text-xs ${pickHour === h && ok ? "border-primary bg-primary text-on-primary" : "border-slate-200 bg-white text-ink-700"} disabled:opacity-35`}
                      >
                        {faNum(h)} تا {faNum(h + 1)}
                      </button>
                    );
                  })}
                </div>
                {preferredTime ? (
                  <p className="text-[11px] text-brand-700 bg-brand-50 rounded-lg px-2.5 py-1.5 mt-3 inline-block">
                    📅 {toJalaliTime(preferredTime)}
                  </p>
                ) : (
                  <p className="text-[11px] text-ink-500 mt-3">روز و ساعت را انتخاب کن (حداقل ۲ ساعت بعد، تا ۷ روز آینده، ۸ صبح تا ۹ شب).</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-ink-500 mb-1 block">دوره تکرار</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([["WEEKLY", "هفتگی"], ["BIWEEKLY", "دو هفته یک‌بار"], ["MONTHLY", "ماهانه"]] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setFrequency(val)}
                        className={`rounded-lg p-2.5 border text-xs ${frequency === val ? "border-brand-500 bg-brand-50 text-brand-700" : "border-brand-100 bg-white"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {frequency === "MONTHLY" ? (
                  <div>
                    <label className="text-xs text-ink-500 mb-1 block">روز ماه (۱ تا ۲۸)</label>
                    <input
                      type="number" min={1} max={28}
                      className="w-full rounded-xl border border-brand-100 p-3 text-sm"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-ink-500 mb-1 block">روز هفته</label>
                    <select
                      className="w-full rounded-xl border border-brand-100 p-3 text-sm"
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    >
                      {WEEKDAY_LABELS.map((label, idx) => (
                        <option key={idx} value={idx}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-ink-500 mb-1 block">
                    بازهٔ ساعت تقریبی مراجعه <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full rounded-xl border border-brand-100 p-3 text-sm"
                    value={preferredHour ?? ""}
                    onChange={(e) => setPreferredHour(e.target.value === "" ? null : Number(e.target.value))}
                  >
                    <option value="" disabled>یک بازه انتخاب کنید...</option>
                    {HOUR_RANGES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {preferredHour === null && (
                    <p className="text-[11px] text-ink-500 mt-1.5">برای ادامه، یک بازهٔ ساعتی انتخاب کنید.</p>
                  )}
                </div>
                <p className="text-[11px] text-ink-500 bg-brand-50 rounded-lg p-2.5">
                  اولین درخواست خودکار فردا صبح ثبت می‌شود و از آن پس طبق دوره انتخابی تکرار خواهد شد.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-bold text-ink-800 mb-1">این پسماند برای چیست؟</p>
              <p className="text-[11px] text-ink-500 mb-2.5 leading-5">
                فقط یک ترجیح اولیه است و شما را به چیزی متعهد نمی‌کند؛ مبلغ دقیق و نحوهٔ تخصیص را پس از وزن‌کشیِ نهایی و در همان درخواست مشخص می‌کنید.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGreenIntent("SELL")}
                  className={`rounded-xl p-3 border text-center transition ${
                    greenIntent === "SELL" ? "border-brand-500 bg-brand-50" : "border-brand-100 bg-white"
                  }`}
                >
                  <span className="text-xl block">💰</span>
                  <p className="text-xs font-bold text-ink-900 mt-1.5">می‌خواهم بفروشم</p>
                  <p className="text-[10.5px] text-ink-500 mt-0.5 leading-4">مبلغ به کیف‌پولم واریز شود</p>
                </button>
                <button
                  type="button"
                  onClick={() => setGreenIntent("DONATE")}
                  className={`rounded-xl p-3 border text-center transition ${
                    greenIntent === "DONATE" ? "border-brand-500 bg-brand-50" : "border-brand-100 bg-white"
                  }`}
                >
                  <span className="text-xl block">🌱</span>
                  <p className="text-xs font-bold text-ink-900 mt-1.5">کمک به اثر سبز</p>
                  <p className="text-[10.5px] text-ink-500 mt-0.5 leading-4">صرف کارهای خیر و محیط‌زیست شود</p>
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">توضیحات (اختیاری)</label>
              <textarea
                className="w-full rounded-xl border border-brand-100 p-3 text-sm"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">عکس پسماند (اختیاری)</label>
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="w-full text-sm" />
            </div>
          </div>
        )}

        {step === 4 && (
          <Card className="p-5">
            <p className="text-sm text-ink-500">مواد و وزن انتخابی</p>
            <ul className="mb-3 mt-1">
              {selectedMaterialObjs.map((m) => (
                <li key={m.id} className="flex justify-between text-sm py-1 border-b border-brand-50 last:border-0">
                  <span className="text-ink-800">
                    {m.name}
                    {m.requires_appraisal && <span className="text-amber-700 text-[10.5px]"> (کارشناسی)</span>}
                  </span>
                  <span className="text-ink-600">{items[m.id].weightKg} کیلوگرم {items[m.id].isExact ? "(دقیق)" : "(تقریبی)"}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-ink-500">زمان‌بندی</p>
            <p className="font-medium text-ink-900 mb-1">
              {scheduleMode === "ONCE" ? "یک‌بار" : `دوره‌ای — ${frequency === "WEEKLY" ? "هفتگی" : frequency === "BIWEEKLY" ? "دو هفته یک‌بار" : "ماهانه"}`}
            </p>
            <p className="text-[11px] text-ink-500 mb-3">
              {scheduleMode === "ONCE"
                ? preferredTime && toJalaliTime(preferredTime)
                : preferredHour !== null && `ساعت تقریبی مراجعه: ${HOUR_RANGES.find((r) => r.value === preferredHour)?.label}`}
            </p>
            <p className="text-sm text-ink-500">ترجیح شما</p>
            <p className="font-medium text-ink-900 mb-3">
              {greenIntent === "SELL" ? "💰 فروش — واریز به کیف‌پول" : "🌱 کمک به اثر سبز"}
            </p>
            <p className="text-sm text-ink-500">ارزش تخمینی</p>
            <p className="font-bold text-brand-600 text-lg mb-1">{formatToman(estimatedValue)} تومان</p>
            <p className="text-[11px] text-ink-500">مبلغ نهایی پس از وزن‌کشی توسط جمع‌آور محاسبه می‌شود.</p>
          </Card>
        )}
      </div>

      {/*
        فاز ۳/۴ (Stitch): این نوار روی موبایل دقیقاً مثل قبل fixed و بالای
        BottomNav است. اما چون به‌صورت viewport-relative (inset-x-0 +
        max-w-md mx-auto) بود، روی دسکتاپ — که دیگر BottomNav ندارد و ستون
        محتوا کنار سایدبار جابه‌جا شده — این نوار وسط کل صفحه (نه وسط ستون
        محتوا) می‌ایستاد و گاهی روی آخرین آیتم‌های دیده‌نشدهٔ لیست می‌افتاد.
        از md به بالا به‌جای fixed، در جریان عادی صفحه (static) و هم‌عرض
        همان ستون محتوا قرار می‌گیرد.
      */}
      <div className="sticky bottom-[68px] z-30 px-4 py-2.5 bg-surface/95 md:static md:px-0 md:pt-2 md:bg-transparent">
        <div className="max-w-md mx-auto md:max-w-none md:mx-0 flex gap-2">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
              قبلی
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button full disabled={!canProceed()} onClick={() => setStep((s) => s + 1)}>
              مرحله بعد
            </Button>
          ) : (
            <Button full loading={busy} onClick={handleSubmit}>
              {accessToken ? "ثبت نهایی درخواست" : "ورود و ثبت نهایی درخواست"}
            </Button>
          )}
        </div>
        {submitError && (
          <p className="text-red-600 text-xs text-center mt-2 bg-white rounded-lg py-1">{submitError.message}</p>
        )}
      </div>

      {successInfo && (
        <RequestSuccessModal
          estimatedValue={successInfo.estimatedValue}
          estimatedPoints={successInfo.estimatedPoints}
          greenIntent={greenIntent}
          requestUid={successInfo.requestUid}
          recurring={successInfo.recurring}
          onClose={() => setSuccessInfo(null)}
        />
      )}
    </div>
  );
}
