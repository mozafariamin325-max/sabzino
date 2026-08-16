import { Link } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import {
  useActiveIdentityCity, useGreenPoints, useMyRequests, useNotifications, usePricing, useWallet,
} from "../api/queries";
import { Card, CenterLoading, DemoBadge, StatusPill } from "../components/ui";
import { formatKg, formatToman, toJalali } from "../lib/format";
import { STATUS_LABELS } from "../api/types";
import { curatedHomePrices } from "../lib/homePrices";
import brandmark from "../assets/brand/brandmark-256.png";

const SERVICES = [
  { to: "/requests/new", label: "درخواست جمع‌آوری", icon: "🚚", bg: "bg-brand-50" },
  { to: "/scan", label: "تشخیص با دوربین", icon: "📷", bg: "bg-rose-50" },
  { to: "/stations", label: "مراکز بازیافت نزدیک", icon: "📍", bg: "bg-amber-50" },
  { to: "/marketplace", label: "فروشگاه سبزینو", icon: "🛍️", bg: "bg-violet-50" },
  { to: "/missions", label: "ماموریت‌های سبز", icon: "🎯", bg: "bg-emerald-50" },
  { to: "/materials", label: "دسته‌بندی و قیمت‌ها", icon: "♻️", bg: "bg-sky-50" },
];

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: points } = useGreenPoints();
  const { data: requests } = useMyRequests();
  const { data: notifications } = useNotifications();
  const { data: prices } = usePricing();
  const { data: city } = useActiveIdentityCity();
  const unread = (notifications || []).filter((n: { is_read: boolean }) => !n.is_read).length;

  const totalKg = (requests || []).reduce((sum, r) => sum + (r.weighing ? Number(r.weighing.weight_kg) : 0), 0);
  const homePrices = curatedHomePrices(prices);

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <Link to="/notifications" className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
          🔔
          {unread > 0 && (
            <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {unread}
            </span>
          )}
        </Link>
        <div className="text-center">
          <div className="flex items-center gap-1.5 justify-center">
            <img src={brandmark} alt="" className="w-6 h-6 object-contain" />
            <h1 className="text-lg font-extrabold text-brand-700">سبزینو</h1>
          </div>
          <p className="text-[11px] text-ink-500">با بازیافت، آینده را سبز کنیم</p>
        </div>
        <Link to="/profile" className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-sm font-bold text-brand-600">
          {user?.first_name?.[0] || "س"}
        </Link>
      </div>

      {city?.has_identity && (
        <div className="px-4 mt-1">
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3 text-white shadow-sm animate-fade-up"
            style={{
              background: `linear-gradient(90deg, ${city.theme_color_from || "#0b3d24"}, ${city.theme_color_to || "#178a49"})`,
            }}
          >
            <span className="text-2xl">{city.landmark_icon || "🏙️"}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">
                سبزینو در {city.name}{city.landmark_name ? ` — ${city.landmark_name}` : ""}
              </p>
              {city.hero_tagline && <p className="text-[10.5px] text-white/85 truncate mt-0.5">{city.hero_tagline}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mt-2">
        <div className="rounded-3xl bg-gradient-to-l from-brand-600 to-brand-500 p-5 text-white shadow-lg animate-fade-up">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-brand-50/90">اعتبار سبزینو</p>
              {walletLoading ? (
                <div className="h-8 w-28 bg-white/20 rounded-lg animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-extrabold mt-1">
                  {formatToman(wallet?.balance)} <span className="text-sm font-normal">تومان</span>
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">👛</div>
          </div>
          <Link
            to="/wallet"
            className="mt-4 inline-flex items-center gap-1.5 bg-white text-brand-700 text-sm font-medium px-4 py-2 rounded-xl"
          >
            شارژ و برداشت
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-brand-600">{points ? points.points : "—"} 🌿</p>
            <p className="text-[11px] text-ink-500 mt-0.5">امتیاز سبزینو</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-brand-600">{formatKg(totalKg)}</p>
            <p className="text-[11px] text-ink-500 mt-0.5">مجموع بازیافت (کیلوگرم)</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-brand-600">{requests ? requests.length : "—"}</p>
            <p className="text-[11px] text-ink-500 mt-0.5">درخواست‌ها</p>
          </Card>
        </div>
      </div>

      <div className="px-4 mt-5">
        <Link
          to="/calculator"
          className="block rounded-2xl bg-gradient-to-l from-brand-700 to-emerald-800 p-4 text-white relative overflow-hidden"
        >
          <p className="font-bold text-sm relative z-10">ضایعاتت چقدر می‌ارزه؟</p>
          <p className="text-xs text-brand-50/90 mt-1 relative z-10">نوع و وزن ضایعات رو انتخاب کن، ارزشش رو همین الان ببین 💰</p>
          <span className="absolute -left-2 -bottom-2 text-6xl opacity-20">🧮</span>
        </Link>
      </div>

      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm text-ink-900">قیمت روز ضایعات</h2>
          <Link to="/materials" className="text-xs text-brand-600 font-medium">
            مشاهده همه
          </Link>
        </div>
        {!prices ? (
          <CenterLoading />
        ) : homePrices.length === 0 ? (
          <Card className="p-4 text-center text-xs text-ink-500">قیمتی برای نمایش ثبت نشده است.</Card>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4">
            {homePrices.map((p) => (
              <Card key={p.id} className="p-3 flex-shrink-0 w-[132px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{p.material_icon || "♻️"}</span>
                  <p className="text-xs font-bold text-ink-900 truncate">{p.label}</p>
                </div>
                <p className="text-sm font-extrabold text-brand-600 mt-2">
                  {formatToman(p.price_per_unit)} <span className="text-[10px] font-normal text-ink-500">ت/{p.unit_display}</span>
                </p>
                {p.market_price && (
                  <p className="text-[10px] text-ink-400 mt-0.5 line-through">بازار: {formatToman(p.market_price)} ت</p>
                )}
                <p className="text-[9.5px] text-ink-400 mt-1.5">{new Date(p.effective_from).toLocaleDateString("fa-IR")}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm text-ink-900">خدمات سبزینو</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SERVICES.map((s) => (
            <Link key={s.to} to={s.to} className={`rounded-2xl ${s.bg} p-4 flex flex-col gap-3`}>
              <span className="text-2xl">{s.icon}</span>
              <span className="text-sm font-medium text-ink-800">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm text-ink-900">درخواست‌های اخیر</h2>
          <Link to="/requests" className="text-xs text-brand-600 font-medium">
            مشاهده همه
          </Link>
        </div>
        {!requests ? (
          <CenterLoading />
        ) : requests.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">هنوز درخواستی ثبت نکرده‌اید.</Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {requests.slice(0, 3).map((r) => (
              <Link to={`/requests/${r.uid}`} key={r.uid}>
                <Card className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-ink-900">درخواست #{r.code}</p>
                    <p className="text-[11px] text-ink-500 mt-0.5">{toJalali(r.created_at)}</p>
                  </div>
                  <StatusPill status={r.status} label={STATUS_LABELS[r.status] || r.status_display} />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-6">
        <Card className="p-4 bg-gradient-to-l from-brand-50 to-white flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-ink-900">با امتیازها تخفیف بگیر!</p>
            <p className="text-xs text-ink-500 mt-0.5">از فروشگاه سبزینو خرید کن و تخفیف بگیر</p>
          </div>
          <span className="text-3xl">🎁</span>
        </Card>
      </div>

      <div className="px-4 mt-4">
        <DemoBadge />
        <span className="text-[11px] text-ink-500 mr-2">برخی داده‌های این صفحه از داده نمونه پایلوت یاسوج است.</span>
      </div>
    </div>
  );
}
