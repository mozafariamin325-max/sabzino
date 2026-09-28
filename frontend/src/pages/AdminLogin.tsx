import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../api/queries";
import { useAuthStore } from "../store/auth";
import { Button } from "../components/ui";
import logo from "../assets/brand/logo-full.png";

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-ink-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/** ورود مدیریت: صفحهٔ جدا (لینکی به آن در رابط عمومی نیست) — ایمیل + رمز عبور. */
export default function AdminLogin() {
  const navigate = useNavigate();
  const login = useLogin();
  const setActiveView = useAuthStore((s) => s.setActiveView);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    try {
      const data = await login.mutateAsync({ identifier: identifier.trim(), password });
      const isAdmin = data.user?.is_staff || data.user?.roles?.some((r: { role: string }) => ["SUPER_ADMIN", "ADMIN", "MUNICIPALITY"].includes(r.role));
      if (!isAdmin) {
        useAuthStore.getState().logout();
        return setError("این حساب دسترسی مدیریت ندارد.");
      }
      setActiveView("ADMIN");
      navigate("/", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="min-h-dvh bg-surface flex flex-col px-6 pt-10 pb-6 max-w-md w-full mx-auto">
      <img src={logo} alt="سبزینو" className="w-36 mx-auto mb-6" draggable={false} />
      <h1 className="text-xl font-extrabold text-ink-900 text-center mb-6">ورود مدیریت</h1>
      <div className="flex flex-col gap-3.5">
        <input className={inputCls} dir="ltr" type="email" autoComplete="username" placeholder="ایمیل"
          value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <input className={inputCls} dir="ltr" type="password" autoComplete="current-password" placeholder="رمز عبور"
          value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <Button full loading={login.isPending} disabled={!identifier || !password} onClick={submit}>ورود</Button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-2xl bg-error-container text-on-error-container text-sm px-4 py-3 text-center">{error}</p>}
    </div>
  );
}
