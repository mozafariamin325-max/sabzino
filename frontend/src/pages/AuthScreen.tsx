import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useCompleteOtpProfile, useRequestOtp, useVerifyOtp } from "../api/queries";
import { isValidIranianNationalId } from "../lib/nationalId";
import { digitsOnly, isValidMobile } from "../lib/digits";
import { Button } from "../components/ui";
import logo from "../assets/brand/logo-full.png";

type Step = "phone" | "code" | "profile";

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-ink-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/**
 * ورود/ثبت‌نام فقط با شماره موبایل + کد تأیید. کاربر جدید فقط نام و کد ملی را
 * اضافه می‌دهد. شمارهٔ موبایل و کد ملی هر کدام فقط یک حساب می‌سازند (بک‌اند
 * هم مستقل چک می‌کند). ورود با ایمیل/گوگل/تلگرام از رابط عمومی حذف شده است؛
 * ادمین از /admin-login وارد می‌شود.
 */
export default function AuthScreen({ variant = "citizen" }: { variant?: "citizen" | "driver" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const setActiveView = useAuthStore((s) => s.setActiveView);
  const fromPath = ((location.state as { from?: { pathname?: string } } | null)?.from?.pathname) || "/";
  const afterLogin = fromPath === "/login" || fromPath === "/driver-login" ? "/" : fromPath;

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [regToken, setRegToken] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const complete = useCompleteOtpProfile();

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  function finish(user?: { roles?: { role: string }[] }) {
    if (variant === "driver" && user?.roles?.some((r) => r.role === "COLLECTOR")) setActiveView("COLLECTOR");
    navigate(afterLogin, { replace: true });
  }

  async function sendCode() {
    setError("");
    if (!isValidMobile(phone)) return setError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.");
    try {
      await requestOtp.mutateAsync({ phone_number: phone });
      setCode("");
      setSeconds(60);
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function verify() {
    setError("");
    if (code.length !== 6) return setError("کد تأیید ۶ رقم است.");
    try {
      const res = await verifyOtp.mutateAsync({ phone_number: phone, code });
      if (res.is_new_user) {
        setRegToken(res.registration_token);
        setStep("profile");
      } else {
        finish(res.user);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function register() {
    setError("");
    if (firstName.trim().length < 2) return setError("نام را کامل وارد کن.");
    if (lastName.trim().length < 2) return setError("نام خانوادگی را کامل وارد کن.");
    if (nationalId.length !== 10) return setError("کد ملی باید دقیقاً ۱۰ رقم باشد.");
    if (!isValidIranianNationalId(nationalId)) return setError("کد ملی معتبر نیست؛ ارقام را دوباره بررسی کن.");
    try {
      await complete.mutateAsync({
        registration_token: regToken, first_name: firstName.trim(), last_name: lastName.trim(),
        national_id: nationalId, city: "یاسوج",
      });
      navigate(afterLogin, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const title = variant === "driver" ? "ورود راننده" : step === "profile" ? "تکمیل ثبت‌نام" : "ورود یا ثبت‌نام";

  return (
    <div className="min-h-dvh bg-surface flex flex-col">
      <div className="flex-1 flex flex-col px-6 pt-8 pb-6 max-w-md w-full mx-auto">
        <img src={logo} alt="سبزینو" className="w-40 mx-auto mb-6 select-none" draggable={false} />

        <h1 className="text-xl font-extrabold text-ink-900 text-center">{title}</h1>
        <p className="text-sm text-ink-500 text-center mt-1.5 mb-7 leading-6">
          {step === "phone" && "شمارهٔ موبایلت را وارد کن؛ کد تأیید برایت ارسال می‌شود."}
          {step === "code" && `کد ۶ رقمی برای ${phone} ارسال شد.`}
          {step === "profile" && "فقط دو مورد باقی مانده؛ برای هر شماره و هر کد ملی فقط یک حساب ساخته می‌شود."}
        </p>

        {step === "phone" && (
          <div className="flex flex-col gap-4">
            <input
              className={`${inputCls} text-center tracking-widest`} dir="ltr" type="tel" inputMode="numeric"
              autoComplete="tel-national" placeholder="09123456789" value={phone}
              onChange={(e) => setPhone(digitsOnly(e.target.value, 11))}
              onKeyDown={(e) => e.key === "Enter" && sendCode()}
            />
            <Button full loading={requestOtp.isPending} disabled={phone.length !== 11} onClick={sendCode}>
              دریافت کد تأیید
            </Button>
          </div>
        )}

        {step === "code" && (
          <div className="flex flex-col gap-4">
            <input
              className={`${inputCls} text-center text-2xl tracking-[0.5em]`} dir="ltr" type="tel" inputMode="numeric"
              autoComplete="one-time-code" placeholder="••••••" value={code}
              onChange={(e) => setCode(digitsOnly(e.target.value, 6))}
              onKeyDown={(e) => e.key === "Enter" && verify()}
            />
            <Button full loading={verifyOtp.isPending} disabled={code.length !== 6} onClick={verify}>
              تأیید و ادامه
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button className="text-ink-500" onClick={() => { setStep("phone"); setError(""); }}>ویرایش شماره</button>
              {seconds > 0 ? (
                <span className="text-ink-400">ارسال مجدد تا {seconds} ثانیه دیگر</span>
              ) : (
                <button className="text-primary font-medium" onClick={sendCode}>ارسال مجدد کد</button>
              )}
            </div>
          </div>
        )}

        {step === "profile" && (
          <div className="flex flex-col gap-3.5">
            <input className={inputCls} placeholder="نام" value={firstName} maxLength={40}
              autoComplete="given-name" onChange={(e) => setFirstName(e.target.value)} />
            <input className={inputCls} placeholder="نام خانوادگی" value={lastName} maxLength={60}
              autoComplete="family-name" onChange={(e) => setLastName(e.target.value)} />
            <input
              className={`${inputCls} text-center tracking-widest`} dir="ltr" type="tel" inputMode="numeric"
              placeholder="کد ملی (۱۰ رقم)" value={nationalId}
              onChange={(e) => setNationalId(digitsOnly(e.target.value, 10))}
            />
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-ink-500 flex items-center justify-between" dir="ltr">
              <span>{phone}</span><span dir="rtl">شمارهٔ تأییدشده</span>
            </div>
            <Button full loading={complete.isPending} onClick={register}>ثبت‌نام و ورود</Button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-error-container text-on-error-container text-sm px-4 py-3 text-center">
            {error}
          </p>
        )}

        <div className="mt-auto pt-8 flex flex-col items-center gap-3 text-xs text-ink-500">
          {variant === "citizen" ? (
            <button onClick={() => navigate("/", { replace: true })} className="text-primary font-medium">
              فعلاً فقط می‌خواهم ببینم — ادامه به‌عنوان مهمان
            </button>
          ) : (
            <Link to="/collector/register" className="text-primary font-medium">ثبت‌نام به‌عنوان راننده</Link>
          )}
          <span className="text-ink-400 text-center leading-5">با ادامه، شرایط استفاده از سبزینو را می‌پذیری.</span>
        </div>
      </div>
    </div>
  );
}
