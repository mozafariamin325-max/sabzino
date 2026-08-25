import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import {
  useIdentityCities, useMyGreenImpact, useMyImpact, useMyRequests, useNotifications, usePricing, useWallet,
} from "../api/queries";
import { Card, CenterLoading, DemoBadge, StatusPill } from "../components/ui";
import { formatKg, formatToman, toJalali } from "../lib/format";
import { STATUS_LABELS } from "../api/types";
import { curatedHomePrices } from "../lib/homePrices";
import brandmark from "../assets/brand/brandmark-256.png";

/**
 * بازطراحی صفحهٔ اصلی (طبق بریف UX/UI کاربر، ۲۰۲۶-۰۸-۲۳؛ ساختار/اولویت‌بندی
 * محتوا حفظ شده): قبلاً ۴ بنر بزرگ تمام‌عرض با رنگ‌های مختلف پشت‌سرهم باعث
 * سردرگمی بصری می‌شد. اکنون: یک CTA اصلی برجسته، یک ویجت کامپکت «کیف‌پول +
 * آمار زیست‌محیطی»، یک گرید ۴تایی منظم برای مهم‌ترین خدمات، و یک ردیف
 * کوچک‌تر برای خدمات فرعی — چیزی حذف نشده، فقط اولویت بصری تنظیم شده.
 *
 * فاز ۴ (Stitch): پالت موقتِ محلی («فقط صفحهٔ اصلی») که قبلاً این‌جا تعریف
 * شده بود، با توکن‌های یکپارچهٔ Stitch (primary/secondary/surface —
 * index.css) جایگزین شد تا صفحهٔ اصلی هم از همان زبان بصری کل اپ استفاده
 * کند؛ گرادیان CTA اکنون primary→secondary است، دقیقاً مطابق بنر Dashboard
 * در مرجع Stitch (_4/code.html: bg-gradient-to-br from-primary to-secondary).
 */

// طبق بریف: گرید اصلی خدمات دقیقاً همین ۴ مورد را نشان می‌دهد.
const PRIMARY_SERVICES = [
  { to: "/stations", label: "مراکز بازیافت", icon: "📍" },
  { to: "/marketplace", label: "بازار عمده", icon: "📦" },
  { to: "/store", label: "فروشگاه سبزینو", icon: "🛍️" },
  { to: "/green-impact", label: "اثر سبز و مشارکت", icon: "🌱" },
];

// خدمات فرعی — چیزی از اپ حذف نشده، فقط از بنر/گرید اصلی به یک ردیف
// کوچک‌تر و کم‌رنگ‌تر منتقل شدند تا صفحه شلوغ نباشد.
const SECONDARY_SERVICES = [
  { to: "/scan", label: "تشخیص با دوربین", icon: "📷" },
  { to: "/calculator", label: "محاسبه‌گر ارزش", icon: "🧮" },
  { to: "/missions", label: "ماموریت‌های سبز", icon: "🎯" },
];

// میانگین جذب کربن یک درخت بالغ در سال؛ برای تبدیل «کربن کاهش‌یافتهٔ
// تخمینی» به «معادل تعداد درخت» — هر دو عدد صریحاً «تخمینی» برچسب می‌خورند،
// نه یک ادعای علمی قطعی (همان اصل شفافیتی که در کل اپ رعایت شده).
const CO2_KG_PER_TREE_PER_YEAR = 21;

const STAGE_LABELS = ["ثبت شده", "در مسیر", "تکمیل شده"];
function stageIndexForStatus(status: string): number {
  if (status === "COMPLETED") return 2;
  if (["ACCEPTED", "ON_THE_WAY", "ARRIVED", "COLLECTED", "WEIGHING"].includes(status)) return 1;
  return 0; // REQUESTED, SEARCHING_COLLECTOR, ASSIGNED
}

export default function Home() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  // فاز ۱۵: صفحهٔ اصلی برای مهمان هم رندر می‌شود (بدون accessToken) — بخش‌های
  // شخصی (کیف‌پول/امتیاز/درخواست‌های اخیر) داده واقعی ندارند، پس به‌جای عدد
  // صفر/لودینگ همیشگی، یک دعوت به ورود نشان داده می‌شود.
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: requests } = useMyRequests();
  const { data: notifications } = useNotifications();
  const { data: prices } = usePricing();
  const { data: identityCities } = useIdentityCities();
  // فاز ۱۵: برای مهمان، شهر از guestCity می‌آید نه user.city (که null است).
  // اگر شهرِ واقعیِ کاربر/مهمان هویت بصری نداشت، به‌جای نمایش اشتباهِ اولین
  // شهرِ لیست (که ممکن است شهر کاملاً متفاوتی باشد)، بنر شهری اصلاً نشان
  // داده نمی‌شود؛ فقط وقتی هیچ شهری اصلاً مشخص نیست (حساب‌های قدیمی بدون
  // شهر) به رفتار قبلی (اولین شهر دارای هویت) برمی‌گردیم.
  const guestCity = useAuthStore((s) => s.guestCity);
  const activeCityName = user?.city || guestCity || null;
  const city =
    (identityCities || []).find((c) => c.name === activeCityName) ||
    (activeCityName ? null : (identityCities || [])[0]) ||
    null;
  const { data: greenImpact } = useMyGreenImpact();
  const { data: myImpact } = useMyImpact();
  const unread = (notifications || []).filter((n: { is_read: boolean }) => !n.is_read).length;

  const homePrices = curatedHomePrices(prices);

  // ویجت وضعیت: اگر درخواست فعال (نه تکمیل‌شده/لغوشده) وجود دارد همان را
  // با تایم‌لاین نشان می‌ده؛ وگرنه آخرین درخواست را به‌صورت یک خط خلاصه.
  const activeRequest = (requests || []).find((r) => !["COMPLETED", "CANCELLED"].includes(r.status));
  const latestRequest = (requests || [])[0];

  const treesEstimate = myImpact ? Math.round(myImpact.co2_kg_saved_estimated / CO2_KG_PER_TREE_PER_YEAR) : null;

  return (
    <div className="min-h-full pb-2 bg-surface">
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

      {/* یک CTA اصلی و برجسته — تنها بنر تمام‌عرض صفحه، به‌جای ۴ بنر قبلی. */}
      <div className="px-4 mt-3">
        <Link
          to="/requests/new"
          className="block rounded-3xl p-5 text-on-primary relative overflow-hidden shadow-tinted-lg active:scale-[0.98] transition animate-fade-up bg-gradient-to-br from-primary to-secondary"
        >
          <span className="absolute -left-10 -top-14 w-40 h-40 rounded-full bg-white/10" aria-hidden="true" />
          <span className="absolute left-6 -bottom-16 w-32 h-32 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative z-10 flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl flex-shrink-0">
              ♻️
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold leading-snug">ثبت درخواست تحویل پسماند</p>
              <p className="text-xs text-white/85 mt-1 leading-relaxed">
                در چند ثانیه ثبت کن — یک جمع‌آور نزدیک می‌آید
              </p>
            </div>
            <span className="text-2xl flex-shrink-0">‹</span>
          </div>
        </Link>
      </div>

      {/* ویجت کامپکت ۲در۱: کیف‌پول + آمار زیست‌محیطی (پسماند/درخت/کربن) — جایگزین کارت کیف‌پول تمام‌عرض قبلی. */}
      <div className="px-4 mt-3">
        {accessToken ? (
          <Card className="p-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-ink-500">اعتبار سبزینو</p>
                {walletLoading ? (
                  <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse mt-1" />
                ) : (
                  <p className="text-xl font-extrabold mt-0.5 text-primary">
                    {formatToman(wallet?.balance)} <span className="text-xs font-normal text-ink-500">تومان</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-secondary/10">
                  👛
                </span>
                <Link
                  to="/wallet"
                  className="text-xs font-medium px-3.5 py-2 rounded-full text-on-secondary bg-secondary"
                >
                  شارژ و برداشت
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-100 mt-4 pt-3 border-t border-slate-100">
              <div className="flex flex-col items-center gap-1 px-1">
                <span className="text-base">♻️</span>
                <p className="text-sm font-extrabold text-ink-900">
                  {formatKg(myImpact?.total_kg_recycled ?? 0)}
                </p>
                <p className="text-[10px] text-ink-500 text-center leading-tight">پسماند بازیافتی</p>
              </div>
              <div className="flex flex-col items-center gap-1 px-1">
                <span className="text-base">🌳</span>
                <p className="text-sm font-extrabold text-ink-900">
                  {treesEstimate !== null ? treesEstimate : "—"}
                </p>
                <p className="text-[10px] text-ink-500 text-center leading-tight">درخت (تخمینی)</p>
              </div>
              <div className="flex flex-col items-center gap-1 px-1">
                <span className="text-base">🌫️</span>
                <p className="text-sm font-extrabold text-ink-900">
                  {myImpact ? formatKg(myImpact.co2_kg_saved_estimated) : "—"}
                </p>
                <p className="text-[10px] text-ink-500 text-center leading-tight">کربن (تخمینی)</p>
              </div>
            </div>
          </Card>
        ) : (
          // فاز ۱۵: حالت مهمان — به‌جای کیف‌پول/امتیاز صفر و گمراه‌کننده، دعوت به ورود
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full text-right rounded-3xl p-5 text-on-primary shadow-tinted-lg animate-fade-up relative overflow-hidden bg-gradient-to-br from-primary to-secondary"
          >
            <span className="absolute -left-6 -top-10 w-32 h-32 rounded-full bg-white/10" aria-hidden="true" />
            <div className="relative z-10 flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl shrink-0">👛</span>
              <div className="min-w-0">
                <p className="text-sm font-bold">در حالت مهمان هستی</p>
                <p className="text-[11px] text-white/85 mt-0.5 leading-relaxed">
                  برای دیدن کیف‌پول، امتیاز و ثبت درخواست، با شماره موبایلت وارد شو
                </p>
              </div>
              <span className="text-xl shrink-0">‹</span>
            </div>
          </button>
        )}
      </div>

      {/* گرید ۴تایی خدمات اصلی — جایگزین بنر «اثر سبز» + گرید ۵تایی قبلی «سایر خدمات». */}
      <div className="px-4 mt-5">
        <h2 className="font-bold text-sm text-ink-900 mb-3">خدمات سبزینو</h2>
        <div className="grid grid-cols-2 gap-3">
          {PRIMARY_SERVICES.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="rounded-2xl bg-white p-4 flex items-center gap-3 shadow-[0_1px_2px_rgba(6,78,59,0.06)] active:scale-[0.98] transition"
            >
              <span className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 bg-secondary/10">
                {s.icon}
              </span>
              <span className="text-sm font-medium text-ink-800 leading-snug">{s.label}</span>
            </Link>
          ))}
        </div>
        {greenImpact && (
          <p className="text-[10.5px] text-ink-400 mt-2 px-1">
            🌱 {greenImpact.tier.icon} {greenImpact.tier.name} — مشارکت من: {formatToman(greenImpact.total_contributed)} تومان
          </p>
        )}
      </div>

      {/* ردیف کوچک‌تر خدمات فرعی — چیزی حذف نشده، فقط کم‌رنگ‌تر و پایین‌تر است. */}
      <div className="px-4 mt-4">
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {SECONDARY_SERVICES.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="shrink-0 flex items-center gap-2 bg-white/70 border border-slate-100 rounded-xl px-3 py-2 text-xs font-medium text-ink-600 active:scale-[0.98] transition"
            >
              <span>{s.icon}</span>
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm text-ink-900">قیمت روز ضایعات</h2>
          <Link to="/materials" className="text-xs font-medium text-primary">
            مشاهده همه
          </Link>
        </div>
        {!prices ? (
          <CenterLoading />
        ) : homePrices.length === 0 ? (
          <Card className="p-4 text-center text-xs text-ink-500">قیمتی برای نمایش ثبت نشده است.</Card>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
            {homePrices.map((p) => (
              <Card key={p.id} className="p-3.5 flex-shrink-0 w-[136px]">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center text-base mb-2 bg-secondary/10">
                  {p.material_icon || "♻️"}
                </span>
                <p className="text-xs font-bold text-ink-900 truncate">{p.label}</p>
                <p className="text-sm font-extrabold mt-1.5 text-primary">
                  {formatToman(p.price_per_unit)} <span className="text-[10px] font-normal text-ink-500">ت/{p.unit_display}</span>
                </p>
                <p className="text-[9.5px] text-ink-400 mt-1.5">{new Date(p.effective_from).toLocaleDateString("fa-IR")}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {accessToken && (
        // فاز ۱۵: این بخش برای مهمان عمداً رندر نمی‌شود — useMyRequests برای
        // مهمان enabled:false است، پس requests همیشه undefined می‌ماند.
        // بازطراحی: به‌جای لیست تکراری کارت‌ها، فقط یک ویجت وضعیت برای
        // درخواست فعال (با تایم‌لاین) یا یک خط خلاصه برای آخرین درخواست.
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-ink-900">وضعیت درخواست</h2>
            <Link to="/requests" className="text-xs font-medium text-primary">
              مشاهده همه
            </Link>
          </div>
          {!requests ? (
            <CenterLoading />
          ) : activeRequest ? (
            <Link to={`/requests/${activeRequest.uid}`}>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-ink-900">درخواست #{activeRequest.code}</p>
                  <StatusPill status={activeRequest.status} label={STATUS_LABELS[activeRequest.status] || activeRequest.status_display} />
                </div>
                <div className="flex items-center">
                  {STAGE_LABELS.map((label, i) => {
                    const stage = stageIndexForStatus(activeRequest.status);
                    const done = i <= stage;
                    return (
                      <div key={label} className="flex-1 flex flex-col items-center">
                        <div className="flex items-center w-full">
                          {i > 0 && (
                            <div className={`h-0.5 flex-1 ${done ? "bg-secondary" : "bg-surface-container-high"}`} />
                          )}
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0 ${done ? "bg-secondary" : "bg-outline-variant"}`}
                          >
                            {i + 1}
                          </span>
                          {i < STAGE_LABELS.length - 1 && (
                            <div className={`h-0.5 flex-1 ${i < stage ? "bg-secondary" : "bg-surface-container-high"}`} />
                          )}
                        </div>
                        <p className="text-[10px] text-ink-500 mt-1.5 text-center">{label}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </Link>
          ) : latestRequest ? (
            <Link to={`/requests/${latestRequest.uid}`}>
              <Card className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink-900">آخرین درخواست: #{latestRequest.code}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">{toJalali(latestRequest.created_at)}</p>
                </div>
                <StatusPill status={latestRequest.status} label={STATUS_LABELS[latestRequest.status] || latestRequest.status_display} />
              </Card>
            </Link>
          ) : (
            <Card className="p-6 text-center text-sm text-ink-500">هنوز درخواستی ثبت نکرده‌اید.</Card>
          )}
        </div>
      )}

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
