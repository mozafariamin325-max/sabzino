import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "../api/queries";
import { Button, Card } from "../components/ui";

export default function Register() {
  const [form, setForm] = useState({
    first_name: "", last_name: "", phone_number: "", email: "", password: "", referral_code: "",
  });
  const navigate = useNavigate();
  const register = useRegister();

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await register.mutateAsync({ ...form, role: "CITIZEN" });
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
