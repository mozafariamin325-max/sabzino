import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "../api/queries";
import { Button, Card } from "../components/ui";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const login = useLogin();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login.mutateAsync({ identifier, password });
      navigate("/", { replace: true });
    } catch {
      /* error surfaced below via login.error */
    }
  }

  return (
    <div className="min-h-dvh flex flex-col justify-center px-6 bg-gradient-to-b from-brand-600 via-brand-600 to-brand-50">
      <div className="max-w-sm mx-auto w-full">
        <div className="flex flex-col items-center mb-8 animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-3xl mb-3">♻️</div>
          <h1 className="text-2xl font-bold text-white">سبزینو</h1>
          <p className="text-brand-50 text-sm mt-1">با بازیافت، آینده را سبز کنیم</p>
        </div>

        <Card className="p-6 animate-fade-up">
          <h2 className="font-bold text-ink-900 mb-4">ورود به حساب</h2>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-ink-500 mb-1 block">ایمیل یا شماره موبایل</label>
              <input
                className="w-full rounded-xl border border-brand-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="مثلاً 09120001001"
                required
                dir="ltr"
                style={{ textAlign: "right" }}
              />
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">رمز عبور</label>
              <input
                type="password"
                className="w-full rounded-xl border border-brand-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {login.error && <p className="text-red-600 text-xs">{(login.error as Error).message}</p>}
            <Button type="submit" full loading={login.isPending} className="mt-2">
              ورود
            </Button>
          </form>
          <p className="text-center text-xs text-ink-500 mt-4">
            حساب کاربری ندارید؟{" "}
            <Link to="/register" className="text-brand-600 font-medium">
              ثبت‌نام کنید
            </Link>
          </p>
        </Card>

        <div className="mt-4 text-center text-[11px] text-brand-700/70 bg-white/40 rounded-xl p-3">
          دسترسی سریع دمو: <b>citizen1@sabzino.demo</b> / <b>Demo@12345</b>
        </div>
      </div>
    </div>
  );
}
