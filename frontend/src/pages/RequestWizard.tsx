import { useMemo, useState } from "react";
import {
  useAddresses, useCreateAddress, useCreateRequest, useCreateRecurringSchedule,
  useMaterialCategories,
} from "../api/queries";
import { WEEKDAY_LABELS, type Address } from "../api/types";
import { Button, Card, CenterLoading, TopBar } from "../components/ui";
import { formatToman, toJalaliTime } from "../lib/format";
import AddressMapPicker from "../components/AddressMapPicker";
import RequestSuccessModal from "../components/RequestSuccessModal";

const STEPS = ["مواد و وزن", "آدرس", "زمان‌بندی", "توضیحات", "تأیید"];
const YASUJ_CENTER = { lat: 30.6683, lng: 51.5877 };
const MAX_WEIGHT_KG = 200;

// فاز ۱۴: بازه‌های ساعتی تقریبی برای جمع‌آوری دوره‌ای — به‌جای یک عدد ساعت
// دقیق («۹»)، شهروند یک بازهٔ یک‌ساعته انتخاب می‌کند (مثلاً «۹ تا ۱۰»)؛
// مقدار ذخیره‌شده همچنان ابتدای بازه است (سازگار با فیلد فعلی preferred_hour).
const HOUR_RANGES = Array.from({ length: 22 - 6 }, (_, i) => 6 + i).map((h) => ({
  value: h,
  label: `${h} تا ${h + 1}`,
}));

type ItemState = { weightKg: number; isExact: boolean };

export default function RequestWizard() {
  const [step, setStep] = useState(0);
  const { data: categories, isLoading } = useMaterialCategories();
  const { data: addresses } = useAddresses();
  const createAddress = useCreateAddress();
  const createRequest = useCreateRequest();
  const createSchedule = useCreateRecurringSchedule();

  const [items, setItems] = useState<Record<number, ItemState>>({});
  const [addressId, setAddressId] = useState<number | null>(null);
  const [addingNewAddress, setAddingNewAddress] = useState(false);
  const [newAddressTitle, setNewAddressTitle] = useState("آدرس جدید");
  const [newAddress, setNewAddress] = useState("");
  const [newLat, setNewLat] = useState(YASUJ_CENTER.lat);
  const [newLng, setNewLng] = useState(YASUJ_CENTER.lng);

  const [scheduleMode, setScheduleMode] = useState<"ONCE" | "RECURRING">("ONCE");
  const [preferredTime, setPreferredTime] = useState("");
  const [frequency, setFrequency] = useState<"WEEKLY" | "BIWEEKLY" | "MONTHLY">("WEEKLY");
  const [dayOfWeek, setDayOfWeek] = useState(6);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  // فاز ۱۴: عمداً به‌جای مقدار پیش‌فرض، null است — شهروند باید خودش یک بازه
  // ساعتی را صراحتاً انتخاب کند تا بتوان ادامه داد (رفع ابهام «چه زمانی؟»).
  const [preferredHour, setPreferredHour] = useState<number | null>(null);

  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [greenIntent, setGreenIntent] = useState<"SELL" | "DONATE">("SELL");
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
    const created = await createAddress.mutateAsync({
      title: newAddressTitle, full_address: newAddress, city: "یاسوج",
      lat: String(newLat), lng: String(newLng), is_default: addressList.length === 0,
    });
    return created.id;
  }

  async function handleSubmit() {
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

      <div className="px-4 pb-32">
        {step === 0 && (
          <div>
            {isLoading ? (
              <CenterLoading />
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-ink-500">می‌توانید چند نوع زباله را هم‌زمان انتخاب کنید و برای هرکدام وزن را با اهرم تنظیم کنید یا دقیق وارد کنید.</p>
                {(categories || []).map((cat) => (
                  <div key={cat.id}>
                    <p className="text-sm font-bold text-ink-800 mb-2">
                      {cat.icon} {cat.name}
                    </p>
                    <div className="flex flex-col gap-2">
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
                                      type="number"
                                      inputMode="numeric"
                                      min={1}
                                      max={MAX_WEIGHT_KG}
                                      step={1}
                                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                                      value={items[m.id].weightKg}
                                      onChange={(e) => {
                                        // فقط عدد صحیح — اعشار و هر کاراکتر غیرعددی (حروف فارسی/انگلیسی) رد می‌شود
                                        const parsed = Math.round(Number(e.target.value));
                                        const clamped = Number.isFinite(parsed) ? Math.min(MAX_WEIGHT_KG, Math.max(1, parsed)) : 1;
                                        updateItem(m.id, { weightKg: clamped });
                                      }}
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
                  </div>
                ))}
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
                <AddressMapPicker lat={newLat} lng={newLng} onChange={handleMapChange} />
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
                <label className="text-xs text-ink-500 mb-1 block">تاریخ و ساعت مراجعه <span className="text-red-500">*</span></label>
                <input
                  type="datetime-local"
                  required
                  className="w-full rounded-xl border border-brand-100 p-3 text-sm"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                />
                {preferredTime ? (
                  <p className="text-[11px] text-brand-700 bg-brand-50 rounded-lg px-2.5 py-1.5 mt-1.5 inline-block">
                    📅 {toJalaliTime(preferredTime)}
                  </p>
                ) : (
                  <p className="text-[11px] text-ink-500 mt-1.5">برای ادامه، تاریخ و ساعت مراجعه را انتخاب کنید.</p>
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

      <div className="fixed bottom-20 inset-x-0 px-4">
        <div className="max-w-md mx-auto flex gap-2">
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
              ثبت نهایی درخواست
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
