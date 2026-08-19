import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { useMe } from "./api/queries";
import { getAvailableViews, viewPath } from "./lib/roles";
import BottomNav from "./components/BottomNav";
import { CenterLoading } from "./components/ui";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import RequestWizard from "./pages/RequestWizard";
import RequestsList from "./pages/RequestsList";
import RequestDetail from "./pages/RequestDetail";
import WalletPage from "./pages/Wallet";
import Profile from "./pages/Profile";
import Stations from "./pages/Stations";
import Materials from "./pages/Materials";
import Marketplace from "./pages/Marketplace";
import Notifications from "./pages/Notifications";
import Leaderboard from "./pages/Leaderboard";
import CollectorRegister from "./pages/CollectorRegister";
import CollectorHome from "./pages/CollectorHome";
import StationOperator from "./pages/StationOperator";
import AdminDashboard from "./pages/AdminDashboard";
import AddressBook from "./pages/AddressBook";
import BusinessDashboard from "./pages/BusinessDashboard";
import Calculator from "./pages/Calculator";
import CameraScan from "./pages/CameraScan";
import Missions from "./pages/Missions";
import Store from "./pages/Store";
import GreenImpact from "./pages/GreenImpact";
import ImpactProjects from "./pages/ImpactProjects";
import ImpactProjectDetail from "./pages/ImpactProjectDetail";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const location = useLocation();
  if (!accessToken) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
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
 * تمام صفحات لاگین‌شده (شهروند/جمع‌آور/اپراتور/ادمین) از ابتدا برای موبایل
 * طراحی شده‌اند (بدون هیچ breakpoint ای در کل کدبیس تا پیش از این). روی
 * تبلت/دسکتاپ همین رابط کاربری بدون هیچ محدودیتی تمام عرض صفحه را می‌گرفت
 * و کشیده/بدشکل می‌شد. راه‌حل: محتوای هر صفحه در یک ستون هم‌عرض با
 * BottomNav (که خودش از قبل max-w-md mx-auto دارد) قرار می‌گیرد — روی
 * گوشی واقعی (کمتر از ۶۷۲px) این max-width اصلاً فعال نمی‌شود (عرض صفحه از
 * ۲۸rem کمتر است)، پس هیچ تغییر بصری‌ای برای اکثریت کاربران واقعی (موبایل)
 * رخ نمی‌دهد؛ فقط روی صفحه‌های بزرگ‌تر محتوا به‌جای کشیده‌شدن، به همان
 * ستونی که BottomNav هم در آن مرکز است محدود می‌شود.
 */
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f4faf6]">
      <div className="max-w-md mx-auto">{children}</div>
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<RequireAuth><AppLayout><Dashboard /></AppLayout></RequireAuth>} />
      <Route path="/requests/new" element={<RequireAuth><AppLayout><RequestWizard /></AppLayout></RequireAuth>} />
      <Route path="/requests" element={<RequireAuth><AppLayout><RequestsList /></AppLayout></RequireAuth>} />
      <Route path="/requests/:uid" element={<RequireAuth><AppLayout><RequestDetail /></AppLayout></RequireAuth>} />
      <Route path="/wallet" element={<RequireAuth><AppLayout><WalletPage /></AppLayout></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><AppLayout><Profile /></AppLayout></RequireAuth>} />
      <Route path="/stations" element={<RequireAuth><AppLayout><Stations /></AppLayout></RequireAuth>} />
      <Route path="/materials" element={<RequireAuth><AppLayout><Materials /></AppLayout></RequireAuth>} />
      <Route path="/marketplace" element={<RequireAuth><AppLayout><Marketplace /></AppLayout></RequireAuth>} />
      <Route path="/store" element={<RequireAuth><AppLayout><Store /></AppLayout></RequireAuth>} />
      <Route path="/notifications" element={<RequireAuth><AppLayout><Notifications /></AppLayout></RequireAuth>} />
      <Route path="/leaderboard" element={<RequireAuth><AppLayout><Leaderboard /></AppLayout></RequireAuth>} />
      <Route path="/calculator" element={<RequireAuth><AppLayout><Calculator /></AppLayout></RequireAuth>} />
      <Route path="/scan" element={<RequireAuth><AppLayout><CameraScan /></AppLayout></RequireAuth>} />
      <Route path="/missions" element={<RequireAuth><AppLayout><Missions /></AppLayout></RequireAuth>} />
      <Route path="/green-impact" element={<RequireAuth><AppLayout><GreenImpact /></AppLayout></RequireAuth>} />
      <Route path="/green-impact/projects" element={<RequireAuth><AppLayout><ImpactProjects /></AppLayout></RequireAuth>} />
      <Route path="/green-impact/projects/:uid" element={<RequireAuth><AppLayout><ImpactProjectDetail /></AppLayout></RequireAuth>} />

      <Route path="/addresses" element={<RequireAuth><AppLayout><AddressBook /></AppLayout></RequireAuth>} />
      <Route path="/collector/register" element={<RequireAuth><AppLayout><CollectorRegister /></AppLayout></RequireAuth>} />
      <Route path="/collector" element={<RequireAuth><RequireRole view="COLLECTOR"><AppLayout><CollectorHome /></AppLayout></RequireRole></RequireAuth>} />
      <Route path="/station-operator" element={<RequireAuth><RequireRole view="STATION_OPERATOR"><AppLayout><StationOperator /></AppLayout></RequireRole></RequireAuth>} />
      <Route path="/business/:kind" element={<RequireAuth><RequireBusinessRole><AppLayout><BusinessDashboard /></AppLayout></RequireBusinessRole></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><RequireRole view="ADMIN"><AppLayout><AdminDashboard /></AppLayout></RequireRole></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
