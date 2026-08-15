import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import {
  useMyOrgProfile, useRegisterOrgProfile, useMaterialCategories,
  useInventoryMovements, useCreateInventoryMovement, useStockSummary,
} from "../api/queries";
import { Button, Card, CenterLoading, DemoBadge, EmptyState, TopBar } from "../components/ui";
import { formatKg, formatToman } from "../lib/format";

const KIND_LABELS: Record<string, { title: string; icon: string }> = {
  FACTORY: { title: "داشبورد کارخانه", icon: "🏭" },
  WHOLESALER: { title: "داشبورد خریدار عمده", icon: "🚚" },
  RECYCLING_CENTER: { title: "داشبورد مرکز بازیافت", icon: "♻️" },
  BUSINESS: { title: "داشبورد کسب‌وکار", icon: "🏪" },
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  PENDING: { text: "در انتظار تأیید مدیر", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { text: "تأیید شده", cls: "bg-brand-50 text-brand-700 border-brand-200" },
  REJECTED: { text: "رد شده", cls: "bg-red-50 text-red-600 border-red-200" },
};

export default function BusinessDashboard({ kind: kindProp }: { kind?: string } = {}) {
  const params = useParams();
  const kindKey = (kindProp || params.kind || "").toUpperCase();
  const meta = KIND_LABELS[kindKey];

  const { data: profile, isLoading: profileLoading } = useMyOrgProfile(kindKey);
  const registerProfile = useRegisterOrgProfile(kindKey);
  const { data: categories } = useMaterialCategories();
  const { data: movements, isLoading: movementsLoading } = useInventoryMovements();
  const { data: stock } = useStockSummary();
  const createMovement = useCreateInventoryMovement();

  const [form, setForm] = useState({ name: "", national_id: "", city: "یاسوج", address: "", phone_number: "" });
  const [movementForm, setMovementForm] = useState({ material: "", direction: "IN", weight_kg: "", counterparty_name: "", note: "" });

  if (!meta) return <Navigate to="/" replace />;

  const allMaterials = (categories || []).flatMap((c) => c.materials);

  if (profileLoading) return <CenterLoading />;

  if (!profile) {
    return (
      <div>
        <TopBar title={meta.title} subtitle="ابتدا پروفایل کسب‌وکار خود را ثبت کنید" />
        <div className="px-4">
          <Card className="p-5 flex flex-col gap-3">
            <input className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm" placeholder="نام کسب‌وکار / مرکز"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <input className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm" placeholder="شناسه ملی / کد اقتصادی (اختیاری)"
              value={form.national_id} onChange={(e) => setForm((f) => ({ ...f, national_id: e.target.value }))} />
            <input className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm" placeholder="شهر"
              value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            <textarea className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm" rows={2} placeholder="آدرس"
              value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            <input className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm" placeholder="شماره تماس" dir="ltr" style={{ textAlign: "right" }}
              value={form.phone_number} onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} />
            {registerProfile.error && <p className="text-red-600 text-xs">{(registerProfile.error as Error).message}</p>}
            <Button
              full
              loading={registerProfile.isPending}
              disabled={!form.name.trim()}
              onClick={() => registerProfile.mutate(form)}
            >
              ثبت پروفایل و ارسال برای تأیید
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_LABEL[profile.verification_status];

  return (
    <div>
      <TopBar title={`${meta.icon} ${meta.title}`} right={<DemoBadge />} />
      <div className="px-4 flex flex-col gap-4">
        <Card className={`p-4 border ${statusMeta.cls}`}>
          <p className="text-sm font-bold">{profile.name}</p>
          <p className="text-xs mt-1">{statusMeta.text}</p>
          {profile.verification_status !== "APPROVED" && (
            <p className="text-[11px] mt-1 opacity-80">تا زمان تأیید، امکان ثبت سفارش در بازارگاه محدود است اما می‌توانید موجودی خود را ثبت کنید.</p>
          )}
        </Card>

        {stock && stock.length > 0 && (
          <Card className="p-4">
            <p className="text-sm font-bold text-ink-900 mb-3">موجودی فعلی</p>
            <div className="flex flex-col gap-2">
              {stock.map((s) => (
                <div key={s.material_id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{s.material__name}</span>
                  <span className={`font-bold ${s.stock_kg < 0 ? "text-red-600" : "text-brand-700"}`}>{formatKg(s.stock_kg)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <p className="text-sm font-bold text-ink-900 mb-3">ثبت ورود / خروج پسماند</p>
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMovementForm((f) => ({ ...f, direction: "IN" }))}
                className={`rounded-lg py-2 text-sm border ${movementForm.direction === "IN" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-brand-100"}`}
              >
                ⬇️ ورود
              </button>
              <button
                onClick={() => setMovementForm((f) => ({ ...f, direction: "OUT" }))}
                className={`rounded-lg py-2 text-sm border ${movementForm.direction === "OUT" ? "border-red-400 bg-red-50 text-red-600" : "border-brand-100"}`}
              >
                ⬆️ خروج
              </button>
            </div>
            <select
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              value={movementForm.material}
              onChange={(e) => setMovementForm((f) => ({ ...f, material: e.target.value }))}
            >
              <option value="">نوع ماده را انتخاب کنید</option>
              {allMaterials.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <input
              type="number" min={0.1} step={0.1}
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              placeholder="وزن (کیلوگرم)"
              value={movementForm.weight_kg}
              onChange={(e) => setMovementForm((f) => ({ ...f, weight_kg: e.target.value }))}
            />
            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              placeholder="طرف حساب (تحویل‌دهنده/گیرنده — اختیاری)"
              value={movementForm.counterparty_name}
              onChange={(e) => setMovementForm((f) => ({ ...f, counterparty_name: e.target.value }))}
            />
            {createMovement.error && <p className="text-red-600 text-xs">{(createMovement.error as Error).message}</p>}
            <Button
              full
              loading={createMovement.isPending}
              disabled={!movementForm.material || !movementForm.weight_kg}
              onClick={() => {
                createMovement.mutate(
                  { ...movementForm, material: Number(movementForm.material), weight_kg: Number(movementForm.weight_kg) },
                  { onSuccess: () => setMovementForm({ material: "", direction: movementForm.direction, weight_kg: "", counterparty_name: "", note: "" }) }
                );
              }}
            >
              ثبت تراکنش
            </Button>
          </div>
        </Card>

        <div>
          <p className="text-sm font-bold text-ink-900 mb-2 px-1">تاریخچه تراکنش‌ها</p>
          {movementsLoading ? (
            <CenterLoading />
          ) : !movements?.length ? (
            <EmptyState icon="📦" title="هنوز تراکنشی ثبت نشده" />
          ) : (
            <div className="flex flex-col gap-2 mb-6">
              {movements.map((mv) => (
                <Card key={mv.uid} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{mv.material_detail.name}</p>
                    <p className="text-[11px] text-ink-500">{mv.counterparty_name || "—"} · {new Date(mv.created_at).toLocaleDateString("fa-IR")}</p>
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-bold ${mv.direction === "IN" ? "text-brand-700" : "text-red-600"}`}>
                      {mv.direction === "IN" ? "+" : "-"}{mv.weight_kg} kg
                    </p>
                    {mv.total_value && <p className="text-[11px] text-ink-500">{formatToman(mv.total_value)} ت</p>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
