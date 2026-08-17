import { useState } from "react";
import { useAddresses, useCreateAddress, useDeleteAddress, useUpdateAddress } from "../api/queries";
import { Button, Card, CenterLoading, EmptyState, TopBar } from "../components/ui";
import AddressMapPicker from "../components/AddressMapPicker";

const YASUJ_CENTER = { lat: 30.6683, lng: 51.5877 };

export default function AddressBook() {
  const { data: addresses, isLoading } = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("آدرس جدید");
  const [fullAddress, setFullAddress] = useState("");
  const [lat, setLat] = useState<number>(YASUJ_CENTER.lat);
  const [lng, setLng] = useState<number>(YASUJ_CENTER.lng);

  async function handleAdd() {
    if (!fullAddress.trim()) return;
    await createAddress.mutateAsync({
      title, full_address: fullAddress, city: "یاسوج", lat: String(lat), lng: String(lng),
      is_default: (addresses || []).length === 0,
    });
    setAdding(false);
    setTitle("آدرس جدید");
    setFullAddress("");
  }

  return (
    <div>
      <TopBar
        title="آدرس‌های من"
        subtitle="روی نقشه بزنید یا پین را جابه‌جا کنید تا موقعیت دقیق ثبت شود"
        right={!adding && <Button variant="secondary" onClick={() => setAdding(true)}>+ افزودن</Button>}
      />

      <div className="px-4">
        {adding && (
          <Card className="p-4 mb-4 flex flex-col gap-3">
            <AddressMapPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              placeholder="عنوان (مثلاً خانه، محل کار)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              rows={2}
              placeholder="آدرس کامل (خیابان، کوچه، پلاک)"
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="secondary" full onClick={() => setAdding(false)}>انصراف</Button>
              <Button full loading={createAddress.isPending} disabled={!fullAddress.trim()} onClick={handleAdd}>
                ذخیره آدرس
              </Button>
            </div>
          </Card>
        )}

        {isLoading ? (
          <CenterLoading />
        ) : !addresses?.length && !adding ? (
          <EmptyState icon="📍" title="هنوز آدرسی ثبت نکرده‌اید" subtitle="برای ثبت درخواست جمع‌آوری به یک آدرس نیاز دارید" />
        ) : (
          <div className="flex flex-col gap-3">
            {(addresses || []).map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-ink-900">{a.title}</p>
                      {a.is_default && (
                        <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">پیش‌فرض</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-500 mt-1">{a.full_address}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {!a.is_default && (
                    <button
                      className="text-xs text-brand-600 font-medium"
                      onClick={() => updateAddress.mutate({ id: a.id, payload: { is_default: true } })}
                    >
                      تنظیم به‌عنوان پیش‌فرض
                    </button>
                  )}
                  <button
                    className="text-xs text-red-600 font-medium mr-auto"
                    onClick={() => {
                      if (confirm("این آدرس حذف شود؟")) deleteAddress.mutate(a.id);
                    }}
                  >
                    حذف
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
