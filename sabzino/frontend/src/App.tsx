import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { useMe } from "./api/queries";
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
import GreenImpact from "./pages/GreenImpact";
import ImpactProjects from "./pages/ImpactProjects";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const location = useLocation();
  if (!accessToken) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f4faf6]">
      {children}
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
      <Route path="/notifications" element={<RequireAuth><AppLayout><Notifications /></AppLayout></RequireAuth>} />
      <Route path="/leaderboard" element={<RequireAuth><AppLayout><Leaderboard /></AppLayout></RequireAuth>} />
      <Route path="/calculator" element={<RequireAuth><AppLayout><Calculator /></AppLayout></RequireAuth>} />
      <Route path="/scan" element={<RequireAuth><AppLayout><CameraScan /></AppLayout></RequireAuth>} />
      <Route path="/missions" element={<RequireAuth><AppLayout><Missions /></AppLayout></RequireAuth>} />
      <Route path="/green-impact" element={<RequireAuth><AppLayout><GreenImpact /></AppLayout></RequireAuth>} />
      <Route path="/green-impact/projects" element={<RequireAuth><AppLayout><ImpactProjects /></AppLayout></RequireAuth>} />

      <Route path="/addresses" element={<RequireAuth><AppLayout><AddressBook /></AppLayout></RequireAuth>} />
      <Route path="/collector/register" element={<RequireAuth><AppLayout><CollectorRegister /></AppLayout></RequireAuth>} />
      <Route path="/collector" element={<RequireAuth><AppLayout><CollectorHome /></AppLayout></RequireAuth>} />
      <Route path="/station-operator" element={<RequireAuth><AppLayout><StationOperator /></AppLayout></RequireAuth>} />
      <Route path="/business/:kind" element={<RequireAuth><AppLayout><BusinessDashboard /></AppLayout></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><AppLayout><AdminDashboard /></AppLayout></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
