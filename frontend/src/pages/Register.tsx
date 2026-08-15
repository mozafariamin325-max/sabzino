import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "../api/queries";
import { Button, Card } from "../components/ui";

export default function Register() {
  const [customerType, setCustomerType] = useState<"INDIVIDUAL" | "ORGANIZATION">("INDIVIDUAL");
  const [form, setForm] = useState({
    first_name: "", last_name: "", phone_number: "", email: "", password: "", referral_code: "",
    center_name: "", manager_name: "", manager_phone: "",
  });
  const navigate = useNavigate();
  const register = useRegister();

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await register.mutateAsync({ ...form, role: "CITIZEN", customer_type: customerType });
      navigate("/", { replace: true });
    } catch {
      /* surfaced below */
    }
  }

  return (
    <div className="min-h-dvh flex flex-col justify-center px-6 py-10 bg-gradient-to-b from-brand-600 via-brand-600 to-brand-50">
      <div className="max-w-sm mx-auto w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-2xl mb-2">♻️</div>
          <h1 className="text-xl font-bold text-white">ساخت حساب سبزینو</h1>
        </div>

        <Card className="p-6">
          <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setCustomerType("INDIVIDUAL")}
              className={`rounded-lg py-2 text-xs font-medium transition ${customerType === "INDIVIDUAL" ? "bg-white text-brand-700 shadow" : "text-ink-500"}`}
            >
              👤 حساب شخصی
            </button>
            <button
              type="button"
              onClick={() => setCustomerType("ORGANIZATION")}
              className={`rounded-lg py-2 text-xs font-medium transition ${customerType === "ORGANIZATION" ? "bg-white text-brand-700 shadow" : "text-ink-500"}`}
            >
              🏢 حساب سازمانی / اداره
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="نام" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required
              />
              <input
                className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="نام خانوادگی" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required
              />
            </div>
            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="شماره موبایل (مثلاً 0912xxxxxxx)" value={form.phone_number}
              onChange={(e) => update("phone_number", e.target.value)} dir="ltr" style={{ textAlign: "right" }}
            />
            <input
              type="email"
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="ایمیل" value={form.email} onChange={(e) => update("email", e.target.value)} dir="ltr" style={{ textAlign: "right" }}
            />
            <input
              type="password"
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="رمز عبور (حداقل ۶ کاراکتر)" value={form.password} onChange={(e) => update("password", e.target.value)} required
            />

            {customerType === "ORGANIZATION" && (
              <div className="flex flex-col gap-3 bg-brand-50/60 rounded-xl p-3 border border-brand-100">
                <p className="text-[11px] text-ink-500">اطلاعات مرکز/اداره — پس از ثبت‌نام، حساب شما توسط مدیر سبزینو بررسی و تأیید می‌شود.</p>
                <input
                  className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
                  placeholder="نام مرکز / اداره" value={form.center_name} onChange={(e) => update("center_name", e.target.value)} required
                />
                <input
                  className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
                  placeholder="نام مدیر / مسئول" value={form.manager_name} onChange={(e) => update("manager_name", e.target.value)} required
                />
                <input
                  className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
                  placeholder="شماره تماس مدیریت" value={form.manager_phone} onChange={(e) => update("manager_phone", e.target.value)}
                  dir="ltr" style={{ textAlign: "right" }} required
                />
              </div>
            )}

            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="کد دعوت (اختیاری)" value={form.referral_code} onChange={(e) => update("referral_code", e.target.value)} dir="ltr" style={{ textAlign: "right" }}
            />
            {register.error && <p className="text-red-600 text-xs">{(register.error as Error).message}</p>}
            <Button type="submit" full loading={register.isPending} className="mt-1">
              ثبت‌نام
            </Button>
          </form>
          <p className="text-center text-xs text-ink-500 mt-4">
            قبلاً ثبت‌نام کرده‌اید؟{" "}
            <Link to="/login" className="text-brand-600 font-medium">
              وارد شوید
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
