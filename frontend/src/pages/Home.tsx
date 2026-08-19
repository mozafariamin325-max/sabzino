import { Link } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import {
  useIdentityCities, useGreenPoints, useMyGreenImpact, useMyRequests, useNotifications, usePricing, useWallet,
} from "../api/queries";
import { Card, CenterLoading, DemoBadge, StatusPill } from "../components/ui";
import { formatKg, formatToman, toJalali } from "../lib/format";
import { STATUS_LABELS } from "../api/types";
import { curatedHomePrices } from "../lib/homePrices";
import brandmark from "../assets/brand/brandmark-256.png";

const SERVICES = [
  { to: "/scan", label: "تشخیص با دوربین", icon: "📷", bg: "bg-rose-50" },
  { to: "/stations", label: "مراکز بازیافت نزدیک", icon: "📍", bg: "bg-amber-50" },
  { to: "/store", label: "فروشگاه سبزینو", icon: "🛍️", bg: "bg-violet-50" },
  { to: "/marketplace", label: "بازار عمده ضایعات", icon: "📦", bg: "bg-orange-50" },
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
  const { data: identityCities } = useIdentityCities();
  const city = (identityCities || []).find((c) => c.name === user?.city) || (identityCities || [])[0] || null;
  const { data: greenImpact } = useMyGreenImpact();
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

      {/* CTA غالب صفحه اصلی — «زباله‌هامو می‌خوام بفروشم». عمداً اولین و
          پررنگ‌ترین عنصر قابل‌کلیک بعد از هدر است، نه یکی از هفت آیتم گرید
          خدمات؛ بقیه خدمات پایین‌تر و کم‌رنگ‌تر می‌آیند. */}
      <div className="px-4 mt-3">
        <Link
          to="/requests/new"
          className="block rounded-3xl p-5 text-white relative overflow-hidden shadow-lg active:scale-[0.98] transition animate-fade-up"
          style={{ background: "linear-gradient(135deg, #0f7a3d 0%, #16a34a 55%, #22c55e 100%)" }}
        >
          <span className="absolute -left-10 -top-14 w-40 h-40 rounded-full bg-white/10" aria-hidden="true" />
          <span className="absolute left-6 -bottom-16 w-32 h-32 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative z-10 flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl flex-shrink-0">
              ♻️
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold leading-snug">زباله‌هامو می‌خوام بفروشم</p>
              <p className="text-xs text-white/85 mt-1 leading-relaxed">
                ثبت درخواست جمع‌آوری در چند ثانیه — یک جمع‌آور نزدیک می‌آید
              </p>
            </div>
            <span className="text-2xl flex-shrink-0">‹</span>
          </div>
        </Link>
      </div>

      <div className="px-4 mt-3">
        <div className="rounded-3xl bg-gradient-to-l from-brand-600 to-brand-500 p-5 text-white shadow-lg animate-fade-up relative overflow-hidden">
          <span className="absolute -left-6 -top-10 w-32 h-32 rounded-full bg-white/10" aria-hidden="true" />
          <span className="absolute left-10 -bottom-12 w-24 h-24 rounded-full bg-white/10" aria-hidden="true" />
          <div className="flex items-start justify-between relative z-10">
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
            className="mt-4 inline-flex items-center gap-1.5 bg-white text-brand-700 text-sm font-medium px-4 py-2 rounded-xl relative z-10 shadow-sm"
          >
            شارژ و برداشت
          </Link>
        </div>

        <Card className="mt-3 p-4 grid grid-cols-3 divide-x divide-x-reverse divide-brand-50/80">
          <div className="flex flex-col items-center gap-1.5 px-1">
            <span className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-base">🌿</span>
            <p className="text-base font-extrabold text-ink-900">{points ? points.points : "—"}</p>
            <p className="text-[10.5px] text-ink-500 text-center leading-tight">امتیاز سبزینو</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 px-1">
            <span className="w-9 h-9 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center text-base">♻️</span>
            <p className="text-base font-extrabold text-ink-900">{formatKg(totalKg)}</p>
            <p className="text-[10.5px] text-ink-500 text-center leading-tight">مجموع بازیافت (کیلوگرم)</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 px-1">
            <span className="w-9 h-9 rounded-full bg-violet-50 text-violet-700 flex items-center justify-center text-base">📦</span>
            <p className="text-base font-extrabold text-ink-900">{requests ? requests.length : "—"}</p>
            <p className="text-[10.5px] text-ink-500 text-center leading-tight">درخواست‌ها</p>
          </div>
        </Card>
      </div>

      <div className="px-4 mt-3">
        <Link
          to="/green-impact"
          className="block rounded-3xl p-5 text-white relative overflow-hidden shadow-md active:scale-[0.99] transition"
          style={{ background: "linear-gradient(120deg, #7c2d12 0%, #b45309 45%, #ca8a04 100%)" }}
        >
          <span className="absolute -left-8 -top-10 w-32 h-32 rounded-full bg-white/10" aria-hidden="true" />
          <span className="absolute left-16 -bottom-14 w-28 h-28 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative z-10 flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
              🌱
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold">اثر سبز و مشارکت اجتماعی</p>
              <p className="text-[11px] text-white/85 mt-0.5 leading-relaxed">
                بخشی از ارزش پسماندت را به کارهای خیر، محیط‌زیست یا اشتغال سبز اختصاص بده — کاملاً اختیاری و شفاف
              </p>
            </div>
          </div>
          <div className="relative z-10 flex items-center justify-between mt-4">
            {greenImpact ? (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1"><span>{greenImpact.tier.icon}</span>{greenImpact.tier.name}</span>
                <span className="text-white/85">مشارکت من: <b>{formatToman(greenImpact.total_contributed)} ت</b></span>
              </div>
            ) : <span />}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white text-amber-800 px-3 py-1.5 rounded-lg">
              مشاهده و مشارکت ‹
            </span>
          </div>
        </Link>
      </div>

      <div className="px-4 mt-5">
        <Link
          to="/calculator"
          className="block rounded-3xl p-5 text-white relative overflow-hidden shadow-md"
          style={{ background: "linear-gradient(120deg, #0b3d24 0%, #14603a 45%, #1c8a4f 100%)" }}
        >
          {/* Decorative eco-illustration layer (flat-design shapes, no external image assets) */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 340 130" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
            <circle cx="300" cy="18" r="34" fill="#ffffff" opacity="0.08" />
            <circle cx="258" cy="98" r="48" fill="#ffffff" opacity="0.06" />
            <path d="M235 130 C 248 92, 300 92, 312 58 L 340 58 L 340 130 Z" fill="#ffffff" opacity="0.05" />
            <g transform="translate(266,50)" opacity="0.95">
              <rect x="-4" y="8" width="38" height="9" rx="4" fill="#ffffff" fillOpacity="0.22" />
              <rect x="10" y="-2" width="10" height="10" rx="2" fill="#ffffff" fillOpacity="0.22" />
              <rect x="0" y="16" width="30" height="34" rx="5" fill="#ffffff" fillOpacity="0.16" />
              <path d="M8 28 l6 -6 l4 4 l8 -8" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
          <div className="relative z-10 max-w-[68%]">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 text-lg mb-2.5">🧮</span>
            <p className="font-bold text-sm">ضایعاتت چقدر می‌ارزه؟</p>
            <p className="text-xs text-brand-50/90 mt-1.5 leading-relaxed">
              نوع و وزن ضایعات رو انتخاب کن، ارزشش رو همین الان ببین
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white text-brand-700 px-3 py-1.5 rounded-lg mt-3">
              محاسبه کن ‹
            </span>
          </div>
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
              <Card key={p.id} className="p-3.5 flex-shrink-0 w-[136px]">
                <span className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-base mb-2">
                  {p.material_icon || "♻️"}
                </span>
                <p className="text-xs font-bold text-ink-900 truncate">{p.label}</p>
                <p className="text-sm font-extrabold text-brand-600 mt-1.5">
                  {formatToman(p.price_per_unit)} <span className="text-[10px] font-normal text-ink-500">ت/{p.unit_display}</span>
                </p>
                <p className="text-[9.5px] text-ink-400 mt-1.5">{new Date(p.effective_from).toLocaleDateString("fa-IR")}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm text-ink-900">سایر خدمات</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SERVICES.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className={`rounded-2xl ${s.bg} p-4 flex flex-col gap-3 shadow-[0_1px_2px_rgba(15,122,61,0.05)] active:scale-[0.98] transition`}
            >
              <span className="w-11 h-11 rounded-full bg-white/70 flex items-center justify-center text-xl shadow-sm">
                {s.icon}
              </span>
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
        <Link to="/store">
          <Card className="p-4 bg-gradient-to-l from-brand-50 to-white flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink-900">با موجودی کیف‌پولت خرید کن!</p>
              <p className="text-xs text-ink-500 mt-0.5">فروشگاه سبزینو — از فروشگاه‌های همکار با موجودی کیف‌پولت خرید کن</p>
            </div>
            <span className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm">🎁</span>
          </Card>
        </Link>
      </div>

      <div className="px-4 mt-4">
        <DemoBadge />
        <span className="text-[11px] text-ink-500 mr-2">برخی داده‌های این صفحه از داده نمونه پایلوت یاسوج است.</span>
      </div>
    </div>
  );
}
