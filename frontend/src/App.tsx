import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { useMe } from "./api/queries";
import { getAvailableViews, viewPath } from "./lib/roles";
import BottomNav from "./components/BottomNav";
import Sidebar from "./components/Sidebar";
import { CenterLoading } from "./components/ui";
import brandmark from "./assets/brand/brandmark-256.png";

// فاز ۸ (Stitch — بهینه‌سازی عملکرد): مسیرهای پرتردد (ورود/ثبت‌نام/داشبورد
// خانه) همچنان eager هستند تا اولین رندر معطل نشود؛ بقیهٔ صفحات — به‌خصوص
// داشبوردهای نقش‌محور (ادمین/جمع‌آور/اپراتور/کسب‌وکار که اکثریت کاربران
// شهروند اصلاً هرگز نمی‌بینند) — با React.lazy جدا شده تا آن ۱٫۱ مگابایت
// باندل واحد (یافتهٔ CRITICAL گزارش ممیزی) به تکه‌های کوچک‌تر و بار-تنبل
// تقسیم شود. هیچ مسیر/رفتاری تغییر نکرده، فقط زمان بارگذاری کد جابه‌جا شده.
import AuthScreen from "./pages/AuthScreen";
import Register from "./pages/Register";
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
const CameraScan = lazy(() => import("./pages/CameraScan"));
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
function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isGuest = useAuthStore((s) => s.isGuest);
  const location = useLocation();
  if (!accessToken && !isGuest) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

/** رفتار قبلی RequireAuth، بدون استثنای مهمان — برای صفحاتی که واقعاً حساب واقعی لازم دارند. */
function RequireRealAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const location = useLocation();
  if (!accessToken) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

/** برای اقدامات واقعی که مرور مهمان کافی نیست: کاربر مهمان پیام CTA می‌بیند، کاربر کاملاً ناشناس مستقیم به /login می‌رود. */
function RequireRealAccount({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isGuest = useAuthStore((s) => s.isGuest);
  const location = useLocation();
  if (accessToken) return <>{children}</>;
  if (isGuest) return <GuestGateNotice />;
  return <Navigate to="/login" replace state={{ from: location }} />;
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
        <div className="max-w-md md:max-w-3xl mx-auto md:mx-0 md:px-10 md:py-8">
          <Suspense fallback={<CenterLoading />}>{children}</Suspense>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default function App() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { isLoading } = useMe(!!accessToken);

  if (accessToken && isLoading) return <CenterLoading />;

  return (
    <Routes>
      <Route path="/login" element={<AuthScreen />} />
      <Route path="/register" element={<Register />} />

      {/* فاز ۱۵: صفحات قابل‌مرور برای مهمان (بدون ورود واقعی) */}
      <Route path="/" element={<RequireAuth><AppLayout><Dashboard /></AppLayout></RequireAuth>} />
      <Route path="/stations" element={<RequireAuth><AppLayout><Stations /></AppLayout></RequireAuth>} />
      <Route path="/calculator" element={<RequireAuth><AppLayout><Calculator /></AppLayout></RequireAuth>} />
      <Route path="/materials" element={<RequireAuth><AppLayout><Materials /></AppLayout></RequireAuth>} />
      <Route path="/green-impact/projects" element={<RequireAuth><AppLayout><ImpactProjects /></AppLayout></RequireAuth>} />
      <Route path="/green-impact/projects/:uid" element={<RequireAuth><AppLayout><ImpactProjectDetail /></AppLayout></RequireAuth>} />

      {/* فاز ۱۵: اقدامات واقعی — کاربر مهمان به‌جای ریدایرکت، پیام CTA می‌بیند */}
      <Route path="/requests/new" element={<RequireRealAccount><AppLayout><RequestWizard /></AppLayout></RequireRealAccount>} />
      <Route path="/wallet" element={<RequireRealAccount><AppLayout><WalletPage /></AppLayout></RequireRealAccount>} />

      {/* بقیهٔ صفحات: مثل قبل، فقط حساب واقعی */}
      <Route path="/requests" element={<RequireRealAuth><AppLayout><RequestsList /></AppLayout></RequireRealAuth>} />
      <Route path="/requests/:uid" element={<RequireRealAuth><AppLayout><RequestDetail /></AppLayout></RequireRealAuth>} />
      <Route path="/profile" element={<RequireRealAuth><AppLayout><Profile /></AppLayout></RequireRealAuth>} />
      <Route path="/marketplace" element={<RequireRealAuth><AppLayout><Marketplace /></AppLayout></RequireRealAuth>} />
      <Route path="/store" element={<RequireRealAuth><AppLayout><Store /></AppLayout></RequireRealAuth>} />
      <Route path="/notifications" element={<RequireRealAuth><AppLayout><Notifications /></AppLayout></RequireRealAuth>} />
      <Route path="/leaderboard" element={<RequireRealAuth><AppLayout><Leaderboard /></AppLayout></RequireRealAuth>} />
      <Route path="/scan" element={<RequireRealAuth><AppLayout><CameraScan /></AppLayout></RequireRealAuth>} />
      <Route path="/missions" element={<RequireRealAuth><AppLayout><Missions /></AppLayout></RequireRealAuth>} />
      <Route path="/green-impact" element={<RequireRealAuth><AppLayout><GreenImpact /></AppLayout></RequireRealAuth>} />

      <Route path="/addresses" element={<RequireRealAuth><AppLayout><AddressBook /></AppLayout></RequireRealAuth>} />
      <Route path="/collector/register" element={<RequireRealAuth><AppLayout><CollectorRegister /></AppLayout></RequireRealAuth>} />
      <Route path="/collector" element={<RequireRealAuth><RequireRole view="COLLECTOR"><AppLayout><CollectorHome /></AppLayout></RequireRole></RequireRealAuth>} />
      <Route path="/station-operator" element={<RequireRealAuth><RequireRole view="STATION_OPERATOR"><AppLayout><StationOperator /></AppLayout></RequireRole></RequireRealAuth>} />
      <Route path="/business/:kind" element={<RequireRealAuth><RequireBusinessRole><AppLayout><BusinessDashboard /></AppLayout></RequireBusinessRole></RequireRealAuth>} />
      <Route path="/admin" element={<RequireRealAuth><RequireRole view="ADMIN"><AppLayout><AdminDashboard /></AppLayout></RequireRole></RequireRealAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
