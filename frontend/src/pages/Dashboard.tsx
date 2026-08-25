import { Suspense, lazy, useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { getAvailableViews } from "../lib/roles";
import RoleSwitcher from "../components/RoleSwitcher";
import { CenterLoading } from "../components/ui";
import Home from "./Home";

// فاز ۸ (Stitch): این چهار داشبورد نقش‌محور را اکثریت کاربران (شهروند
// معمولی) هرگز نمی‌بینند — قبلاً همیشه در باندل اصلی بارگذاری می‌شدند چون
// این فایل (که خودش eager است، چون مسیر "/" است) آن‌ها را static import
// می‌کرد. با lazy، فقط وقتی activeView واقعاً همان نقش باشد دانلود می‌شوند.
const CollectorHome = lazy(() => import("./CollectorHome"));
const StationOperator = lazy(() => import("./StationOperator"));
const BusinessDashboard = lazy(() => import("./BusinessDashboard"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));

/**
 * Root "/" route. A single account can hold several roles at once (spec:
 * citizen + collector is the common case in the demo seed), so instead of
 * always landing on the citizen Home screen, this renders whichever view the
 * user last picked with RoleSwitcher — defaulting to CITIZEN.
 */
export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const activeView = useAuthStore((s) => s.activeView);
  const setActiveView = useAuthStore((s) => s.setActiveView);
  const views = getAvailableViews(user);

  // If a previously-picked view is no longer available (e.g. logged into a
  // different, less-privileged account), fall back to CITIZEN silently.
  const resolvedView = views.some((v) => v.key === activeView) ? activeView : "CITIZEN";
  useEffect(() => {
    if (resolvedView !== activeView) setActiveView("CITIZEN");
  }, [resolvedView, activeView, setActiveView]);

  return (
    <div>
      <RoleSwitcher />
      <Suspense fallback={<CenterLoading />}>
        {resolvedView === "COLLECTOR" && <CollectorHome />}
        {resolvedView === "STATION_OPERATOR" && <StationOperator />}
        {resolvedView === "ADMIN" && <AdminDashboard />}
        {["FACTORY", "WHOLESALER", "RECYCLING_CENTER", "BUSINESS"].includes(resolvedView) && (
          <BusinessDashboard kind={resolvedView} />
        )}
        {resolvedView === "CITIZEN" && <Home />}
      </Suspense>
    </div>
  );
}
