import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin, useRequestOtp, useVerifyOtp } from "../api/queries";
import { useAuthStore } from "../store/auth";
import { Button, Card } from "../components/ui";
import CompleteProfileModal from "../components/CompleteProfileModal";
import CityPicker from "../components/CityPicker";
import brandmark from "../assets/brand/brandmark-256.png";

type Tab = "otp" | "email";
type OtpStep = "phone" | "code";

const RESEND_SECONDS = 45;

/**
 * فاز ۱۵ — بازطراحی کامل صفحهٔ ورود طبق طرح ماک‌آپ کاربر: دو روش ورود
 * (پیامکی/OTP به‌عنوان روش اصلی، ایمیل+رمز به‌عنوان روش جایگزین با تب
 * قابل‌جابجایی)، دکمه‌های گوگل/تلگرام فقط ظاهری (طبق تصمیم صریح کاربر —
 * بدون OAuth واقعی)، و ورودی «حالت مهمان» با انتخاب شهر. رنگ‌بندی عیناً از
 * پالت برند فعلی (brand-500 = #16a34a) گرفته شده، طبق درخواست صریح کاربر
 * که رنگ فعلی حفظ شود.
 */
export default function AuthScreen() {
  const navigate = useNavigate();
  const enterGuestMode = useAuthStore((s) => s.enterGuestMode);

  const [tab, setTab] = useState<Tab>("otp");
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  // ---------------- OTP flow ----------------
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [phone, setPhone] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [testCode, setTestCode] = useState<string | null>(null);
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  useEffect(() => {
    if (otpStep !== "code") return;
    const timer = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [otpStep]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await requestOtp.mutateAsync({ phone_number: phone });
      setPendingPhone(phone);
      setCode("");
      setOtpStep("code");
      setSecondsLeft(RESEND_SECONDS);
      setTestCode(res.test_code ?? null);
    } catch {
      /* error surfaced below via requestOtp.error */
    }
  }

  async function handleResend() {
    if (secondsLeft > 0 || requestOtp.isPending) return;
    try {
      const res = await requestOtp.mutateAsync({ phone_number: pendingPhone });
      setSecondsLeft(RESEND_SECONDS);
      setTestCode(res.test_code ?? null);
    } catch {
      /* error surfaced below via requestOtp.error */
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await verifyOtp.mutateAsync({ phone_number: pendingPhone, code });
      if (res.is_new_user) {
        setRegistrationToken(res.registration_token);
      } else {
        navigate("/", { replace: true });
      }
    } catch {
      /* error surfaced below via verifyOtp.error */
    }
  }

  function resetOtp() {
    setOtpStep("phone");
    setCode("");
    setSecondsLeft(0);
    setTestCode(null);
    setRegistrationToken(null);
  }

  // ---------------- Email/password flow ----------------
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login.mutateAsync({ identifier, password });
      navigate("/", { replace: true });
    } catch {
      /* error surfaced below via login.error */
    }
  }

  // ---------------- Guest mode ----------------
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [guestCity, setGuestCity] = useState("");

  function handleEnterGuest() {
    if (!guestCity) return;
    enterGuestMode(guestCity);
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-brand-700 via-brand-600 to-[#f4faf6]">
      <div className="max-w-sm mx-auto w-full px-6 pt-10 pb-6">
        <div className="flex flex-col items-center mb-6 animate-fade-up">
          <div className="w-20 h-20 rounded-2xl bg-white/15 flex items-center justify-center p-2 mb-3">
            <img src={brandmark} alt="سبزینو" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">سبزینو</h1>
          <p className="text-brand-50 text-sm mt-1">با بازیافت، آینده را سبز کنیم ♻️</p>
        </div>

        <Card className="p-5 animate-fade-up">
          <div className="grid grid-cols-2 gap-2 mb-5 bg-slate-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setTab("otp")}
              className={`rounded-lg py-2 text-xs font-bold transition ${tab === "otp" ? "bg-white text-brand-700 shadow" : "text-ink-500"}`}
            >
              📱 ورود با موبایل
            </button>
            <button
              type="button"
              onClick={() => setTab("email")}
              className={`rounded-lg py-2 text-xs font-bold transition ${tab === "email" ? "bg-white text-brand-700 shadow" : "text-ink-500"}`}
            >
              ✉️ ایمیل و رمز عبور
            </button>
          </div>

          {tab === "otp" && (
            <div>
              {otpStep === "phone" && (
                <form onSubmit={handleSendCode} className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-ink-500 mb-1 block">شماره موبایل</label>
                    <input
                      className="w-full rounded-xl border border-brand-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="مثلاً 09120001001"
                      dir="ltr"
                      style={{ textAlign: "right" }}
                      inputMode="numeric"
                      minLength={10}
                      required
                    />
                  </div>
                  {requestOtp.error && <p className="text-red-600 text-xs">{(requestOtp.error as Error).message}</p>}
                  <Button type="submit" full loading={requestOtp.isPending} className="mt-1">
                    دریافت کد تأیید
                  </Button>
                </form>
              )}

              {otpStep === "code" && (
                <form onSubmit={handleVerify} className="flex flex-col gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-ink-500">کد ۶ رقمی ارسال‌شده به {pendingPhone}</label>
                      <button type="button" onClick={resetOtp} className="text-[11px] text-brand-600 font-medium">
                        ویرایش شماره
                      </button>
                    </div>
                    <input
                      className="w-full rounded-xl border border-brand-100 px-3 py-2.5 text-lg tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-brand-300"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="——————"
                      dir="ltr"
                      inputMode="numeric"
                      maxLength={6}
                      required
                    />
                  </div>

                  {testCode && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      حالت تست فعال است — کد تأیید: <b dir="ltr">{testCode}</b>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-500">
                      {secondsLeft > 0 ? `ارسال مجدد تا ${secondsLeft} ثانیه دیگر` : "کد را دریافت نکردید؟"}
                    </span>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={secondsLeft > 0 || requestOtp.isPending}
                      className="text-brand-600 font-bold disabled:text-ink-300"
                    >
                      ارسال مجدد کد
                    </button>
                  </div>

                  {verifyOtp.error && <p className="text-red-600 text-xs">{(verifyOtp.error as Error).message}</p>}
                  <Button type="submit" full loading={verifyOtp.isPending} disabled={code.length !== 6} className="mt-1">
                    تأیید و ورود
                  </Button>
                </form>
              )}
            </div>
          )}

          {tab === "email" && (
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-ink-500">رمز عبور</label>
                  <button
                    type="button"
                    onClick={() => setSocialNotice("بازیابی رمز عبور به‌زودی فعال می‌شود.")}
                    className="text-[11px] text-brand-600 font-medium"
                  >
                    فراموشی رمز عبور؟
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-brand-100 px-3 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400 text-xs"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              {login.error && <p className="text-red-600 text-xs">{(login.error as Error).message}</p>}
              <Button type="submit" full loading={login.isPending} className="mt-1">
                ورود
              </Button>
              <p className="text-center text-xs text-ink-500 mt-1">
                حساب کاربری ندارید؟{" "}
                <Link to="/register" className="text-brand-600 font-medium">
                  ثبت‌نام کنید
                </Link>
              </p>
            </form>
          )}

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-slate-100 flex-1" />
            <span className="text-[11px] text-ink-400">یا</span>
            <div className="h-px bg-slate-100 flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setSocialNotice("ورود با گوگل به‌زودی فعال می‌شود.")}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-medium text-ink-700"
            >
              <span>🔴</span> گوگل
            </button>
            <button
              type="button"
              onClick={() => setSocialNotice("ورود با تلگرام به‌زودی فعال می‌شود.")}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-medium text-ink-700"
            >
              <span>🔵</span> تلگرام
            </button>
          </div>
          {socialNotice && <p className="text-center text-[11px] text-ink-400 mt-2.5">{socialNotice}</p>}
        </Card>

        {/* فاز ۱۵: حالت مهمان — مرور بدون ورود، فقط با انتخاب شهر */}
        <Card className="p-4 mt-4 animate-fade-up">
          {!showGuestPicker ? (
            <button
              type="button"
              onClick={() => setShowGuestPicker(true)}
              className="w-full text-center text-sm font-bold text-brand-700"
            >
              ادامه به‌عنوان مهمان 🌿
            </button>
          ) : (
            <div>
              <p className="text-xs font-bold text-ink-700 mb-2.5">برای مرور، شهرت را انتخاب کن</p>
              <CityPicker value={guestCity} onChange={setGuestCity} />
              <Button full disabled={!guestCity} onClick={handleEnterGuest} className="mt-3">
                ادامه به‌عنوان مهمان
              </Button>
              <p className="text-[10.5px] text-ink-400 mt-2 text-center leading-5">
                در حالت مهمان می‌توانی نقشه، قیمت‌ها و پروژه‌های اثر سبز همین شهر را ببینی — برای ثبت درخواست یا کیف‌پول، ورود واقعی لازم است.
              </p>
            </div>
          )}
        </Card>

        <div className="mt-4 text-center text-[11px] text-brand-700/70 bg-white/40 rounded-xl p-3">
          دسترسی سریع دمو: <b dir="ltr">citizen1@sabzino.demo</b> / <b dir="ltr">Demo@12345</b>
        </div>
      </div>

      {registrationToken && (
        <CompleteProfileModal
          registrationToken={registrationToken}
          onDone={() => navigate("/", { replace: true })}
          onCancel={resetOtp}
        />
      )}
    </div>
  );
}
