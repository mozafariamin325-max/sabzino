import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { useMe } from "./api/queries";
import { getAvailableViews, viewPath } from "./lib/roles";
import BottomNav from "./components/BottomNav";
import Sidebar from "./components/Sidebar";
import { CenterLoading } from "./components/ui";
import brandmark from "./assets/brand/brandmark-256.png";
import { initNativeShell, isNative } from "./lib/native";
import AdminLogin from "./pages/AdminLogin";
import GuestProfile from "./components/GuestProfile";
import GuestImpactIntro from "./components/GuestImpactIntro";

// فاز ۸ (Stitch — بهینه‌سازی عملکرد): مسیرهای پرتردد (ورود/ثبت‌نام/داشبورد
// خانه) همچنان eager هستند تا اولین رندر معطل نشود؛ بقیهٔ صفحات — به‌خصوص
// داشبوردهای نقش‌محور (ادمین/جمع‌آور/اپراتور/کسب‌وکار که اکثریت کاربران
// شهروند اصلاً هرگز نمی‌بینند) — با React.lazy جدا شده تا آن ۱٫۱ مگابایت
// باندل واحد (یافتهٔ CRITICAL گزارش ممیزی) به تکه‌های کوچک‌تر و بار-تنبل
// تقسیم شود. هیچ مسیر/رفتاری تغییر نکرده، فقط زمان بارگذاری کد جابه‌جا شده.
import AuthScreen from "./pages/AuthScreen";
import Dashboard from "./pages/Dashboard";
import RequestWizard from "./pages/RequestWizard";

const RequestsList = lazy(() => import("./pages/RequestsList"));
const RequestDetail = lazy(() => import("./pages/RequestDetail"));
const WalletPage = lazy(() => import("./pages/Wallet"));
const Profile = lazy(() => import("./pages/Profile"));
const Stations = lazy(() => import("./pages/Stations"));
const Materials = lazy(() => import("./pages/Materials"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const CollectorRegister = lazy(() => import("./pages/CollectorRegister"));
const CollectorHome = lazy(() => import("./pages/CollectorHome"));
const StationOperator = lazy(() => import("./pages/StationOperator"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AddressBook = lazy(() => import("./pages/AddressBook"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const Calculator = lazy(() => import("./pages/Calculator"));
const About = lazy(() => import("./pages/About"));
const Missions = lazy(() => import("./pages/Missions"));
const Store = lazy(() => import("./pages/Store"));
const GreenImpact = lazy(() => import("./pages/GreenImpact"));
const ImpactProjects = lazy(() => import("./pages/ImpactProjects"));
const ImpactProjectDetail = lazy(() => import("./pages/ImpactProjectDetail"));
import GuestGateNotice from "./components/GuestGateNotice";

/**
 * فاز ۱۵ — حالت مهمان: صفحات قابل‌مرور بدون ورود واقعی (نقشه، ماشین‌حساب،
 * پروژه‌های اثر سبز و...) با accessToken یا isGuest باز می‌شوند. بقیهٔ
 * صفحات یا با RequireRealAuth (ریدایرکت خشک به /login، بدون تغییر رفتار
 * قبلی) یا — برای دو اقدام واقعیِ صراحتاً نام‌برده‌شده در درخواست کاربر
 * (ثبت درخواست/کیف‌پول) — با RequireRealAccount (پیام دوستانهٔ CTA به‌جای
 * ریدایرکت خشک برای کاربر مهمان) محافظت می‌شوند.
 */
const loggedOutTarget = () => "/login";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isGuest = useAuthStore((s) => s.isGuest);
  const location = useLocation();
  if (!accessToken && !isGuest) return <Navigate to={loggedOutTarget()} replace state={{ from: location }} />;
  return <>{children}</>;
}

/** فاز ۱۹: صفحه‌ای که کاربر واردشده نسخهٔ واقعی‌اش را می‌بیند و مهمان یک نسخهٔ معرفی/دعوت به ورود. */
function GuestOr({ guest, children }: { guest: React.ReactNode; children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isGuest = useAuthStore((s) => s.isGuest);
  const location = useLocation();
  if (accessToken) return <>{children}</>;
  if (isGuest) return <>{guest}</>;
  return <Navigate to={loggedOutTarget()} replace state={{ from: location }} />;
}

/** رفتار قبلی RequireAuth، بدون استثنای مهمان — برای صفحاتی که واقعاً حساب واقعی لازم دارند. */
function RequireRealAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const location = useLocation();
  if (!accessToken) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

/** برای اقدامات واقعی که مرور مهمان کافی نیست: کاربر مهمان پیام CTA می‌بیند، کاربر کاملاً ناشناس مستقیم به /login می‌رود. */
function RequireRealAccount({
  children, title, description, icon,
}: { children: React.ReactNode; title?: string; description?: string; icon?: string }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isGuest = useAuthStore((s) => s.isGuest);
  const location = useLocation();
  if (accessToken) return <>{children}</>;
  if (isGuest) return <AppLayout><GuestGateNotice title={title} description={description} icon={icon} /></AppLayout>;
  return <Navigate to={loggedOutTarget()} replace state={{ from: location }} />;
}

/**
 * Role gate for the dedicated collector/station-operator/admin dashboards:
 * an account without that role is bounced straight to its own default view
 * (right from login, no flash of someone else's operational data) instead of
 * being able to reach these URLs by typing them directly. General citizen
 * pages (wallet, requests, missions, etc.) stay open to every authenticated
 * account, matching the app's existing "everyone also has a CITIZEN view"
 * design (see lib/roles.ts) — only these role-specific dashboards are gated.
 */
function RequireRole({ view, children }: { view: string; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const views = getAvailableViews(user);
  if (!views.some((v) => v.key === view)) {
    return <Navigate to={viewPath(views[0]?.key ?? "CITIZEN")} replace />;
  }
  return <>{children}</>;
}

function RequireBusinessRole({ children }: { children: React.ReactNode }) {
  const { kind } = useParams();
  const user = useAuthStore((s) => s.user);
  const views = getAvailableViews(user);
  if (!kind || !views.some((v) => v.key === kind)) {
    return <Navigate to={viewPath(views[0]?.key ?? "CITIZEN")} replace />;
  }
  return <>{children}</>;
}

/**
 * فاز ۳ (Stitch — لایهٔ ریسپانسیو واقعی):
 * موبایل (< md): دقیقاً رفتار قبلی، بدون تغییر — ستون تمام‌عرض + BottomNav ثابت.
 * دسکتاپ/تبلت (>= md): به‌جای کِش‌آمدن همان ستون موبایل روی صفحهٔ بزرگ (باگ
 * اصلیِ گزارش ممیزی)، یک سایدبار ناوبری ثابت سمت راست (Sidebar) + یک هدر
 * شیشه‌ای ثابت بالای صفحه اضافه می‌شود و محتوا در یک عرض خوانا (max-w-3xl)
 * داخل فضای باقی‌ماندهٔ کنار سایدبار جا می‌گیرد. BottomNav با md:hidden در
 * دسکتاپ محو می‌شود؛ هیچ مسیر/منطقی تغییر نکرده، فقط پوستهٔ نمایش.
 */
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="hidden md:flex fixed top-0 inset-x-0 z-30 h-16 items-center justify-between px-8 glass">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={brandmark} alt="" className="w-7 h-7 object-contain" />
          <span className="font-bold text-primary">سبزینو</span>
        </Link>
      </header>

      <Sidebar />

      <div className="md:mr-64 md:pt-16">
        <div className="max-w-md md:max-w-3xl mx-auto md:mx-0 md:px-10 md:py-8 pb-24 md:pb-8">
          <Suspense fallback={<CenterLoading />}>{children}</Suspense>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

/**
 * فاز ۱۹: دکمهٔ Back سخت‌افزاری اندروید. اگر تاریخچه دارد یک قدم برمی‌گردد؛
 * در صفحهٔ اصلی «دوبار Back برای خروج». در وب هیچ کاری نمی‌کند.
 */
function NativeBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  const lastBackRef = useRef(0);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!isNative) return;
    let remove: (() => void) | undefined;
    let cancelled = false;
    import("@capacitor/app").then(({ App: CapApp }) => {
      CapApp.addListener("backButton", () => {
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
        if (idx > 0) {
          navigate(-1);
          return;
        }
        if (pathRef.current !== "/" && pathRef.current !== "/login") {
          navigate("/", { replace: true });
          return;
        }
        const now = Date.now();
        if (now - lastBackRef.current < 2000) {
          CapApp.exitApp();
          return;
        }
        lastBackRef.current = now;
        setToast(true);
        setTimeout(() => setToast(false), 2000);
      }).then((h) => {
        if (cancelled) h.remove();
        else remove = () => h.remove();
      }).catch(() => {
        /* پلاگین در دسترس نیست (مثلاً مرورگر) — بی‌اثر */
      });
    }).catch(() => {});
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [navigate]);

  if (!toast) return null;
  return (
    <div className="fixed bottom-24 inset-x-0 z-[60] flex justify-center pointer-events-none">
      <span className="bg-ink-900/90 text-white text-xs px-4 py-2 rounded-full">برای خروج، دوباره بازگشت را بزنید</span>
    </div>
  );
}

export default function App() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { isLoading } = useMe(!!accessToken);

  useEffect(() => {
    initNativeShell();
  }, []);

  if (accessToken && isLoading) return <CenterLoading />;

  return (
    <>
    <NativeBackHandler />
    <Routes>
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/driver-login" element={<AuthScreen variant="driver" />} />
      <Route path="/login" element={<AuthScreen />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />

      {/* فاز ۱۵: صفحات قابل‌مرور برای مهمان (بدون ورود واقعی) */}
      <Route path="/" element={<RequireAuth><AppLayout><Dashboard /></AppLayout></RequireAuth>} />
      <Route path="/stations" element={<RequireAuth><AppLayout><Stations /></AppLayout></RequireAuth>} />
      <Route path="/calculator" element={<RequireAuth><AppLayout><Calculator /></AppLayout></RequireAuth>} />
      <Route path="/materials" element={<RequireAuth><AppLayout><Materials /></AppLayout></RequireAuth>} />
      <Route path="/marketplace" element={<RequireAuth><AppLayout><Marketplace /></AppLayout></RequireAuth>} />
      <Route path="/store" element={<RequireAuth><AppLayout><Store /></AppLayout></RequireAuth>} />
      <Route path="/leaderboard" element={<RequireAuth><AppLayout><Leaderboard /></AppLayout></RequireAuth>} />
      <Route path="/about" element={<RequireAuth><AppLayout><About /></AppLayout></RequireAuth>} />
      <Route path="/missions" element={<RequireAuth><AppLayout><Missions /></AppLayout></RequireAuth>} />
      <Route path="/green-impact" element={<GuestOr guest={<AppLayout><GuestImpactIntro /></AppLayout>}><AppLayout><GreenImpact /></AppLayout></GuestOr>} />
      <Route path="/profile" element={<GuestOr guest={<AppLayout><GuestProfile /></AppLayout>}><AppLayout><Profile /></AppLayout></GuestOr>} />
      <Route path="/green-impact/projects" element={<RequireAuth><AppLayout><ImpactProjects /></AppLayout></RequireAuth>} />
      <Route path="/green-impact/projects/:uid" element={<RequireAuth><AppLayout><ImpactProjectDetail /></AppLayout></RequireAuth>} />

      {/* فاز ۱۵: اقدامات واقعی — کاربر مهمان به‌جای ریدایرکت، پیام CTA می‌بیند */}
      <Route path="/requests/new" element={<RequireAuth><AppLayout><RequestWizard /></AppLayout></RequireAuth>} />
      <Route path="/wallet" element={<RequireRealAccount icon="💰" title="کیف‌پول سبزینو" description="با ورود، موجودی، تراکنش‌ها و برداشت وجهت را اینجا مدیریت می‌کنی."><AppLayout><WalletPage /></AppLayout></RequireRealAccount>} />

      {/* بقیهٔ صفحات: مثل قبل، فقط حساب واقعی */}
      <Route path="/requests" element={<RequireRealAccount icon="📋" title="درخواست‌هایت اینجا نمایش داده می‌شود" description="بعد از ورود، وضعیت همهٔ درخواست‌های تحویل زباله‌ات را می‌بینی."><AppLayout><RequestsList /></AppLayout></RequireRealAccount>} />
      <Route path="/requests/:uid" element={<RequireRealAuth><AppLayout><RequestDetail /></AppLayout></RequireRealAuth>} />
      <Route path="/notifications" element={<RequireRealAccount icon="🔔" title="اعلان‌هایت اینجاست" description="بعد از ورود، اعلان پذیرش درخواست و واریز پول را اینجا می‌بینی."><AppLayout><Notifications /></AppLayout></RequireRealAccount>} />

      <Route path="/addresses" element={<RequireRealAuth><AppLayout><AddressBook /></AppLayout></RequireRealAuth>} />
      <Route path="/collector/register" element={<RequireRealAuth><AppLayout><CollectorRegister /></AppLayout></RequireRealAuth>} />
      <Route path="/collector" element={<RequireRealAuth><RequireRole view="COLLECTOR"><AppLayout><CollectorHome /></AppLayout></RequireRole></RequireRealAuth>} />
      <Route path="/station-operator" element={<RequireRealAuth><RequireRole view="STATION_OPERATOR"><AppLayout><StationOperator /></AppLayout></RequireRole></RequireRealAuth>} />
      <Route path="/business/:kind" element={<RequireRealAuth><RequireBusinessRole><AppLayout><BusinessDashboard /></AppLayout></RequireBusinessRole></RequireRealAuth>} />
      <Route path="/admin" element={<RequireRealAuth><RequireRole view="ADMIN"><AppLayout><AdminDashboard /></AppLayout></RequireRole></RequireRealAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
