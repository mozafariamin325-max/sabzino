import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore, LAUNCHED_CITIES } from "../store/auth";
import { Button, Card, TopBar } from "./ui";
import { useState } from "react";
import CityPicker from "./CityPicker";
import brandmark from "../assets/brand/brandmark-256.png";

/** فاز ۱۹: تب «پروفایل» برای کاربر مهمان — معرفی + ورود، به‌جای پرتاب خشک به صفحهٔ لاگین. */
export default function GuestProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const guestCity = useAuthStore((s) => s.guestCity);
  const enterGuestMode = useAuthStore((s) => s.enterGuestMode);
  const [changing, setChanging] = useState(false);

  function login() {
    navigate("/login", { state: { from: location } });
  }
  return (
    <div>
      <TopBar title="پروفایل" />
      <div className="px-4 flex flex-col gap-3 pb-6">
        <Card className="p-6 text-center">
          <img src={brandmark} alt="" className="w-16 h-16 mx-auto object-contain mb-3" />
          <h2 className="font-bold text-ink-900">مهمان سبزینو</h2>
          <p className="text-xs text-ink-500 mt-1 leading-6">
            با ورود، درخواست‌های تحویل زباله، کیف‌پول، امتیاز و اثر سبز خودت را اینجا می‌بینی.
          </p>
          <Button full className="mt-4" onClick={login}>ورود / ثبت‌نام با شماره موبایل</Button>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-ink-500">شهر انتخاب‌شده</p>
            <p className="text-sm font-bold text-ink-900">{guestCity || "—"}</p>
          </div>
          {LAUNCHED_CITIES.length > 1 && <button onClick={() => setChanging((v) => !v)} className="text-xs text-brand-600 font-medium">{changing ? "بستن" : "تغییر شهر"}</button>}
        </Card>
        {changing && (
          <Card className="p-4">
            <CityPicker value={guestCity || ""} onChange={(c) => { enterGuestMode(c); setChanging(false); }} />
          </Card>
        )}

        <Card className="p-2">
          {[
            { to: "/calculator", icon: "🧮", label: "ضایعاتت چقدر می‌ارزه؟" },
            { to: "/materials", icon: "♻️", label: "دسته‌بندی و قیمت مواد" },
            { to: "/leaderboard", icon: "🏆", label: "جدول امتیازات" },
            { to: "/missions", icon: "🎯", label: "ماموریت‌های سبز" },
            { to: "/about", icon: "ℹ️", label: "دربارهٔ سبزینو" },
          ].map((l) => (
            <Link key={l.to} to={l.to} className="flex items-center gap-3 px-3 py-3 text-sm text-ink-700">
              <span>{l.icon}</span>
              <span className="flex-1">{l.label}</span>
              <span className="text-ink-300">‹</span>
            </Link>
          ))}
        </Card>
      </div>
    </div>
  );
}
