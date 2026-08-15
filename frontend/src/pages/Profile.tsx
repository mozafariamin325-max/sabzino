import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useGreenPoints } from "../api/queries";
import { Card, TopBar } from "../components/ui";

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: points } = useGreenPoints();
  const navigate = useNavigate();

  const roles = user?.roles?.map((r) => r.role) || [];

  return (
    <div>
      <TopBar title="پروفایل" />
      <div className="px-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center text-xl font-bold">
            {user?.first_name?.[0] || "س"}
          </div>
          <div>
            <p className="font-bold text-ink-900">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-ink-500 mt-0.5">{user?.phone_number || user?.email}</p>
            {points && (
              <p className="text-xs text-brand-600 mt-1">
                سطح {points.level} — {points.points} امتیاز سبزینو 🌿
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4 mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">کد دعوت شما</p>
            <p className="text-xs text-ink-500 mt-0.5">دوستان‌تان را دعوت کنید و امتیاز بگیرید</p>
          </div>
          <span className="font-mono text-sm font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg">
            {user?.referral_code}
          </span>
        </Card>

        <div className="mt-5 flex flex-col gap-2">
          <MenuLink to="/requests" icon="📦" label="درخواست‌های من" />
          <MenuLink to="/wallet" icon="👛" label="کیف پول" />
          <MenuLink to="/stations" icon="📍" label="ایستگاه‌های بازیافت" />
          <MenuLink to="/leaderboard" icon="🏆" label="رتبه‌بندی شهروندان" />

          {roles.includes("COLLECTOR") ? (
            <MenuLink to="/collector" icon="🚚" label="داشبورد جمع‌آور" />
          ) : (
            <MenuLink to="/collector/register" icon="🚚" label="ثبت‌نام به‌عنوان جمع‌آور" />
          )}
          {roles.includes("STATION_OPERATOR") && <MenuLink to="/station-operator" icon="🏪" label="پنل اپراتور ایستگاه" />}
          {(user?.is_staff || roles.includes("MUNICIPALITY")) && <MenuLink to="/admin" icon="🛠️" label="داشبورد مدیریت" />}
        </div>

        <button
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="w-full mt-6 text-center text-red-600 text-sm font-medium py-3"
        >
          خروج از حساب
        </button>
      </div>
    </div>
  );
}

function MenuLink({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link to={to}>
      <Card className="p-4 flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-ink-800 flex-1">{label}</span>
        <span className="text-ink-300">‹</span>
      </Card>
    </Link>
  );
}
