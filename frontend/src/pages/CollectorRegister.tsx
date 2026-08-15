import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRegisterCollector } from "../api/queries";
import { Button, Card, TopBar } from "../components/ui";

export default function CollectorRegister() {
  const navigate = useNavigate();
  const registerCollector = useRegisterCollector();
  const [form, setForm] = useState({
    national_id: "", city: "یاسوج", service_area: "", bank_account_number: "", sheba_number: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await registerCollector.mutateAsync(form);
    navigate("/collector", { replace: true });
  }

  return (
    <div>
      <TopBar title="ثبت‌نام جمع‌آور" subtitle="مثل اسنپ، جمع‌آور شوید و کسب درآمد کنید" />
      <div className="px-4">
        <Card className="p-5">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              placeholder="کد ملی" value={form.national_id} onChange={(e) => update("national_id", e.target.value)} required
            />
            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              placeholder="شهر" value={form.city} onChange={(e) => update("city", e.target.value)} required
            />
            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              placeholder="محدوده فعالیت (مثلاً مرکز شهر)" value={form.service_area} onChange={(e) => update("service_area", e.target.value)}
            />
            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              placeholder="شماره حساب بانکی" value={form.bank_account_number} onChange={(e) => update("bank_account_number", e.target.value)} dir="ltr"
            />
            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
              placeholder="شماره شبا (IR...)" value={form.sheba_number} onChange={(e) => update("sheba_number", e.target.value)} dir="ltr"
            />
            {registerCollector.error && <p className="text-red-600 text-xs">{(registerCollector.error as Error).message}</p>}
            <p className="text-[11px] text-ink-500">
              پس از ثبت‌نام، مدارک شما توسط مدیر سبزینو بررسی و تأیید می‌شود. بارگذاری تصویر مدارک از پنل جمع‌آور امکان‌پذیر است.
            </p>
            <Button type="submit" full loading={registerCollector.isPending}>
              ثبت‌نام و ارسال برای بررسی
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
