import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddresses, useCreateAddress, useCreateRequest, useMaterialCategories } from "../api/queries";
import { AMOUNT_RANGES, type Address } from "../api/types";
import { Button, Card, CenterLoading, TopBar } from "../components/ui";
import { formatToman } from "../lib/format";

const STEPS = ["مواد", "مقدار", "آدرس", "زمان و توضیحات", "تأیید"];

export default function RequestWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const { data: categories, isLoading } = useMaterialCategories();
  const { data: addresses } = useAddresses();
  const createAddress = useCreateAddress();
  const createRequest = useCreateRequest();

  const [selectedMaterials, setSelectedMaterials] = useState<number[]>([]);
  const [amountRange, setAmountRange] = useState("");
  const [addressId, setAddressId] = useState<number | null>(null);
  const [newAddress, setNewAddress] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const addressList: Address[] = addresses || [];

  const allMaterials = useMemo(() => (categories || []).flatMap((c) => c.materials), [categories]);
  const selectedMaterialObjs = allMaterials.filter((m) => selectedMaterials.includes(m.id));

  const estimatedValue = useMemo(() => {
    if (!selectedMaterialObjs.length || !amountRange) return 0;
    const avgPrice =
      selectedMaterialObjs.reduce((s, m) => s + Number(m.current_price || 0), 0) / selectedMaterialObjs.length;
    const midpoints: Record<string, number> = { UNDER_5: 3, R5_10: 7.5, R10_20: 15, R20_50: 35, R50_100: 75, OVER_100: 120 };
    return Math.round(avgPrice * (midpoints[amountRange] || 5));
  }, [selectedMaterialObjs, amountRange]);

  function toggleMaterial(id: number) {
    setSelectedMaterials((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function canProceed() {
    if (step === 0) return selectedMaterials.length > 0;
    if (step === 1) return !!amountRange;
    if (step === 2) return !!addressId || newAddress.trim().length > 5;
    return true;
  }

  async function handleSubmit() {
    let finalAddressId = addressId;
    if (!finalAddressId && newAddress.trim()) {
      const created = await createAddress.mutateAsync({ title: "آدرس جدید", full_address: newAddress, city: "یاسوج", is_default: addressList.length === 0 });
      finalAddressId = created.id;
    }
    const fd = new FormData();
    selectedMaterials.forEach((id) => fd.append("material_ids", String(id)));
    fd.append("amount_range", amountRange);
    if (finalAddressId) fd.append("address", String(finalAddressId));
    else fd.append("address_text_snapshot", newAddress);
    if (preferredTime) fd.append("preferred_time", new Date(preferredTime).toISOString());
    if (description) fd.append("description", description);
    if (photo) fd.append("photo", photo);

    const res = await createRequest.mutateAsync(fd);
    navigate(`/requests/${res.request.uid}`, { replace: true });
  }

  return (
    <div>
      <TopBar title="ثبت درخواست جمع‌آوری" subtitle={`مرحله ${step + 1} از ${STEPS.length} — ${STEPS[step]}`} />

      <div className="px-4 mb-4">
        <div className="h-1.5 bg-brand-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="px-4">
        {step === 0 && (
          <div>
            {isLoading ? (
              <CenterLoading />
            ) : (
              <div className="flex flex-col gap-4">
                {(categories || []).map((cat) => (
                  <div key={cat.id}>
                    <p className="text-sm font-bold text-ink-800 mb-2">
                      {cat.icon} {cat.name}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {cat.materials.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => toggleMaterial(m.id)}
                          className={`text-right rounded-xl p-3 border text-sm transition ${
                            selectedMaterials.includes(m.id)
                              ? "border-brand-500 bg-brand-50 text-brand-700"
                              : "border-brand-100 bg-white text-ink-700"
                          }`}
                        >
                          <p className="font-medium">{m.name}</p>
                          <p className="text-[11px] text-ink-500 mt-0.5">{formatToman(m.current_price)} تومان/کیلو</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-2.5">
            {AMOUNT_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setAmountRange(r.value)}
                className={`text-right rounded-xl p-4 border text-sm ${
                  amountRange === r.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-brand-100 bg-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            {addressList.map((addr) => (
              <button
                key={addr.id}
                onClick={() => {
                  setAddressId(addr.id);
                  setNewAddress("");
                }}
                className={`text-right rounded-xl p-4 border text-sm ${
                  addressId === addr.id ? "border-brand-500 bg-brand-50" : "border-brand-100 bg-white"
                }`}
              >
                <p className="font-medium">{addr.title}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">{addr.full_address}</p>
              </button>
            ))}
            <div>
              <label className="text-xs text-ink-500 mb-1 block">یا یک آدرس جدید وارد کنید</label>
              <textarea
                className="w-full rounded-xl border border-brand-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                rows={3}
                placeholder="یاسوج، خیابان..."
                value={newAddress}
                onChange={(e) => {
                  setNewAddress(e.target.value);
                  setAddressId(null);
                }}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-ink-500 mb-1 block">زمان پیشنهادی (اختیاری)</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-brand-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">توضیحات (اختیاری)</label>
              <textarea
                className="w-full rounded-xl border border-brand-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">عکس پسماند (اختیاری)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <Card className="p-5">
            <p className="text-sm text-ink-500">مواد انتخابی</p>
            <p className="font-medium text-ink-900 mb-3">{selectedMaterialObjs.map((m) => m.name).join("، ")}</p>
            <p className="text-sm text-ink-500">مقدار تقریبی</p>
            <p className="font-medium text-ink-900 mb-3">{AMOUNT_RANGES.find((r) => r.value === amountRange)?.label}</p>
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
            <Button full loading={createRequest.isPending} onClick={handleSubmit}>
              ثبت نهایی درخواست
            </Button>
          )}
        </div>
        {createRequest.error && (
          <p className="text-red-600 text-xs text-center mt-2 bg-white rounded-lg py-1">{(createRequest.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}
