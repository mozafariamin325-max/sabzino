import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import {
  downloadAdminExport, useAdminCharts, useDecideVerification, useGlobalSearch, useVerificationCenter,
  useAdminPricing, useSetPrice, useAllCities, useUpdateCity, useChallenges, useListings, useAdminPurchaseRequests,
  useImpactDashboard, useImpactProjects, useCreateImpactProject, useUpdateImpactProject,
} from "../api/queries";
import { Button, Card, CenterLoading, DemoBadge, EmptyState, TopBar } from "../components/ui";
import { formatKg, formatNumber, formatToman } from "../lib/format";
import { IMPACT_CATEGORY_LABELS, type ImpactCategory, type ImpactProject } from "../api/types";
import brandmark from "../assets/brand/brandmark-256.png";

const CHART_COLORS = { primary: "#16a34a", secondary: "#0ea5e9", danger: "#dc2626", muted: "#94a3b8" };

function jalaliDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fa-IR", { month: "2-digit", day: "2-digit" });
  } catch {
    return iso;
  }
}

type Tab = "overview" | "verification" | "charts" | "prices" | "missions" | "cities" | "b2b" | "impact" | "tools";

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.is_staff;
  const [tab, setTab] = useState<Tab>("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const path = isStaff ? "/admin-dashboard/" : "/municipality/dashboard/";
      const { data } = await api.get(path);
      return data.dashboard;
    },
  });

  if (isLoading || !data) return <CenterLoading />;

  const groupedKpis = isStaff
    ? [
        {
          title: "کاربران و مشارکت",
          icon: "👥",
          items: [
            { label: "کل کاربران", value: formatNumber(data.total_users) },
            { label: "فعال این بازه", value: formatNumber(data.active_users_period) },
            { label: "جمع‌آوران (کل)", value: formatNumber(data.collectors_total) },
            { label: "جمع‌آوران آنلاین اکنون", value: formatNumber(data.collectors_active_now) },
          ],
        },
        {
          title: "عملیات امروز",
          icon: "📦",
          items: [
            { label: "سفارش‌های امروز", value: formatNumber(data.orders_today) },
            { label: "درخواست‌های امروز", value: formatNumber(data.collection_requests_today) },
            { label: "درخواست‌های این بازه", value: formatNumber(data.collection_requests_period) },
            { label: "تکمیل‌شده این بازه", value: formatNumber(data.completed_collections_period) },
          ],
        },
        {
          title: "پسماند و بازیافت",
          icon: "♻️",
          items: [
            { label: "کل پسماند (کیلوگرم)", value: formatKg(data.total_waste_kg) },
            { label: "پربازدیدترین ماده", value: data.top_material?.name || "—" },
            { label: "وزن پربازدیدترین ماده", value: data.top_material ? formatKg(data.top_material.weight_kg) : "—" },
            { label: "ایستگاه‌های فعال", value: formatNumber(data.stations_total) },
          ],
        },
        {
          title: "مالی",
          icon: "💰",
          items: [
            { label: "سفارش‌ها (GMV)", value: `${formatToman(data.gmv_total)} ت` },
            { label: "درآمد پلتفرم", value: `${formatToman(data.platform_revenue_total)} ت` },
            { label: "موجودی کل کیف پول‌ها", value: `${formatToman(data.wallet_total_balance)} ت` },
            { label: "در انتظار تأیید", value: formatNumber(data.pending_verifications) },
          ],
        },
        {
          title: "بازار B2B و سازمان‌ها",
          icon: "🏭",
          items: [
            { label: "مراکز بازیافت", value: formatNumber(data.recycling_centers_total) },
            { label: "کارخانه‌ها", value: formatNumber(data.factories_total) },
            { label: "خریداران عمده", value: formatNumber(data.wholesalers_total) },
            { label: "چالش‌های فعال", value: formatNumber(data.active_challenges) },
          ],
        },
      ]
    : [
        {
          title: "نمای کلی شهرداری",
          icon: "🏛️",
          items: [
            { label: "کل پسماند بازه (کیلوگرم)", value: formatKg(data.total_waste_kg) },
            { label: "درخواست‌های جمع‌آوری", value: formatNumber(data.collection_requests) },
            { label: "درخواست‌های تکمیل‌شده", value: formatNumber(data.completed_requests) },
            { label: "شهروندان فعال", value: formatNumber(data.active_participating_citizens) },
            { label: "ایستگاه‌های فعال", value: formatNumber(data.active_stations) },
            { label: "جمع‌آوران تأییدشده", value: formatNumber(data.approved_collectors) },
          ],
        },
      ];

  return (
    <div>
      <TopBar
        title={isStaff ? "داشبورد مدیریت سبزینو" : "داشبورد شهرداری یاسوج"}
        right={<DemoBadge />}
      />

      {isStaff && (
        <div className="px-4 mb-3 -mx-1 overflow-x-auto">
          <div className="flex gap-2 px-1 w-max">
            {([
              ["overview", "📊 نمای کلی"],
              ["verification", `✅ تأیید ثبت‌نام‌ها${data.pending_verifications ? ` (${data.pending_verifications})` : ""}`],
              ["charts", "📈 نمودارها"],
              ["prices", "🏷️ قیمت‌ها"],
              ["missions", "🎯 ماموریت‌ها"],
              ["cities", "🏙️ شهرها"],
              ["b2b", "🏭 بازار B2B"],
              ["impact", "🌱 اثر سبز"],
              ["tools", "🔎 جستجو و خروجی"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`text-xs px-3 py-2 rounded-lg font-medium whitespace-nowrap ${tab === key ? "bg-brand-500 text-white" : "bg-white text-ink-600 border border-brand-100"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4">
        {(!isStaff || tab === "overview") && (
          <div className="flex flex-col gap-4 pb-6">
            {isStaff && (
              <div className="flex items-center gap-2 mb-1">
                <img src={brandmark} alt="" className="w-6 h-6 object-contain" />
                <p className="text-xs text-ink-500">خلاصه‌ی زنده‌ی عملکرد پلتفرم سبزینو</p>
              </div>
            )}
            {groupedKpis.map((group) => (
              <Card key={group.title} className="p-4">
                <p className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-1.5">
                  <span>{group.icon}</span>
                  {group.title}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map((k) => (
                    <div key={k.label} className="bg-brand-50/60 rounded-xl p-3">
                      <p className="text-base font-extrabold text-brand-700">{k.value}</p>
                      <p className="text-[10.5px] text-ink-500 mt-1 leading-4">{k.label}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            <p className="text-[11px] text-ink-400 mt-1 leading-5">
              مدیریت کامل و پیشرفته‌ی کاربران، کمیسیون‌ها و رکوردهای خام همچنان از طریق پنل ادمین جنگو (Django Admin) در آدرس{" "}
              <code dir="ltr">/admin/</code> نیز در دسترس است؛ تب‌های بالا میان‌بر مدیریت روزمره‌ی سبزینو هستند.
            </p>
          </div>
        )}

        {isStaff && tab === "verification" && <VerificationTab />}
        {isStaff && tab === "charts" && <ChartsTab />}
        {isStaff && tab === "prices" && <PricesTab />}
        {isStaff && tab === "missions" && <MissionsTab />}
        {isStaff && tab === "cities" && <CitiesTab />}
        {isStaff && tab === "b2b" && <B2BTab />}
        {isStaff && tab === "impact" && <ImpactTab />}
        {isStaff && tab === "tools" && <ToolsTab />}
      </div>
    </div>
  );
}

function PricesTab() {
  const { data, isLoading } = useAdminPricing();
  const setPrice = useSetPrice();
  const [editing, setEditing] = useState<number | null>(null);
  const [buy, setBuy] = useState("");
  const [market, setMarket] = useState("");

  if (isLoading) return <CenterLoading />;
  const rows = (data || []).filter((p) => p.active);

  return (
    <div className="flex flex-col gap-3 pb-6">
      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-1">قیمت روز ضایعات</p>
        <p className="text-[11px] text-ink-500 leading-5">
          قیمت خرید سبزینو و قیمت مرجع بازار آزاد را برای هر ماده ویرایش کن — تغییرات بلافاصله در «قیمت روز» صفحهٔ اصلی و
          محاسبه‌گر ارزش ضایعات اعمال می‌شود. ثبت رکورد جدید قیمت قبلی را در تاریخچه نگه می‌دارد و تراکنش‌های گذشته را تغییر نمی‌دهد.
        </p>
      </Card>
      {rows.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{p.material_icon || "♻️"}</span>
              <div>
                <p className="text-sm font-bold text-ink-900">{p.material_name}</p>
                <p className="text-[10.5px] text-ink-400">{p.category_name} · واحد: {p.unit_display}</p>
              </div>
            </div>
            {editing !== p.material && (
              <Button
                variant="secondary"
                className="!py-1.5 !px-3 !text-xs"
                onClick={() => {
                  setEditing(p.material);
                  setBuy(p.price_per_unit);
                  setMarket(p.market_price || "");
                }}
              >
                ویرایش
              </Button>
            )}
          </div>

          {editing === p.material ? (
            <div className="mt-3 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10.5px] text-ink-500 mb-1 block">قیمت خرید سبزینو (تومان)</label>
                  <input
                    className="w-full rounded-lg border border-brand-100 px-2.5 py-2 text-xs"
                    inputMode="numeric"
                    value={buy}
                    onChange={(e) => setBuy(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10.5px] text-ink-500 mb-1 block">قیمت مرجع بازار (تومان، اختیاری)</label>
                  <input
                    className="w-full rounded-lg border border-brand-100 px-2.5 py-2 text-xs"
                    inputMode="numeric"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 !py-2 !text-xs"
                  loading={setPrice.isPending}
                  onClick={() => {
                    setPrice.mutate(
                      { material: p.material, price_per_unit: Number(buy), market_price: market ? Number(market) : null },
                      { onSuccess: () => setEditing(null) },
                    );
                  }}
                >
                  ثبت قیمت جدید
                </Button>
                <Button variant="secondary" className="flex-1 !py-2 !text-xs" onClick={() => setEditing(null)}>
                  انصراف
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-brand-50/60 rounded-lg p-2 text-center">
                <p className="text-xs font-bold text-brand-700">{formatToman(p.price_per_unit)}</p>
                <p className="text-[9.5px] text-ink-500 mt-0.5">خرید سبزینو</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 text-center">
                <p className="text-xs font-bold text-ink-700">{p.market_price ? formatToman(p.market_price) : "—"}</p>
                <p className="text-[9.5px] text-ink-500 mt-0.5">قیمت بازار</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 text-center">
                <p className="text-[10px] font-bold text-ink-700">{new Date(p.effective_from).toLocaleDateString("fa-IR")}</p>
                <p className="text-[9.5px] text-ink-500 mt-0.5">آخرین بروزرسانی</p>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function MissionsTab() {
  const { data, isLoading } = useChallenges();
  if (isLoading) return <CenterLoading />;
  if (!data?.length) return <EmptyState icon="🎯" title="هنوز ماموریتی ثبت نشده" />;

  const TYPE_LABELS: Record<string, string> = {
    WEIGHT: "بر اساس وزن", TRANSACTIONS: "بر اساس تعداد تراکنش", STREAK: "بر اساس پیوستگی",
    REFERRAL: "بر اساس دعوت", NEIGHBORHOOD: "بر اساس محله",
  };

  return (
    <div className="flex flex-col gap-3 pb-6">
      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-1">ماموریت‌های سبز فعال</p>
        <p className="text-[11px] text-ink-500 leading-5">
          ساخت و ویرایش ماموریت جدید از پنل ادمین جنگو (مدل Challenge) انجام می‌شود؛ این‌جا فقط نمای زنده‌ی ماموریت‌های در حال اجراست.
        </p>
      </Card>
      {data.map((c) => (
        <Card key={c.id} className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink-900">{c.title}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.is_active ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-ink-500"}`}>
              {c.is_active ? "فعال" : "غیرفعال"}
            </span>
          </div>
          {c.description && <p className="text-xs text-ink-500 mt-1">{c.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-500">
            <span>{TYPE_LABELS[c.type] || c.type}</span>
            <span>هدف: {formatNumber(c.target_value)}</span>
            <span className="text-brand-600 font-medium">🌿 {formatNumber(c.reward_points)} امتیاز</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function CitiesTab() {
  const { data, isLoading } = useAllCities();
  const updateCity = useUpdateCity();

  if (isLoading) return <CenterLoading />;

  return (
    <div className="flex flex-col gap-3 pb-6">
      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-1">هویت محلی شهرها</p>
        <p className="text-[11px] text-ink-500 leading-5">
          فقط شهرهایی که «فعال» هستند، در صفحهٔ اصلی هویت بصری اختصاصی (پس‌زمینه و شعار محلی) نشان می‌دهند.
        </p>
      </Card>
      {(data || []).map((city) => (
        <Card key={city.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{city.landmark_icon || "🏙️"}</span>
              <div>
                <p className="text-sm font-bold text-ink-900">{city.name}</p>
                <p className="text-[10.5px] text-ink-400">{city.landmark_name || "بدون لندمارک ثبت‌شده"}</p>
              </div>
            </div>
            <button
              onClick={() => updateCity.mutate({ id: city.id, payload: { has_identity: !city.has_identity } })}
              className={`text-[11px] px-3 py-1.5 rounded-lg font-medium ${city.has_identity ? "bg-brand-500 text-white" : "bg-slate-100 text-ink-600"}`}
            >
              {city.has_identity ? "فعال" : "غیرفعال"}
            </button>
          </div>
          {city.hero_tagline && <p className="text-[11px] text-ink-500 mt-2">«{city.hero_tagline}»</p>}
        </Card>
      ))}
    </div>
  );
}

function B2BTab() {
  const { data: listings, isLoading: listingsLoading } = useListings();
  const { data: purchaseRequests, isLoading: prLoading } = useAdminPurchaseRequests();

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-2">آگهی‌های فروش (بازار عمده)</p>
        {listingsLoading ? (
          <CenterLoading />
        ) : !listings?.length ? (
          <p className="text-xs text-ink-400">آگهی‌ای ثبت نشده است.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {listings.slice(0, 15).map((l) => (
              <div key={l.uid} className="text-xs py-2 border-t border-brand-50 flex items-center justify-between">
                <span>{l.material_detail?.name} — {formatKg(l.quantity_kg)} — {l.location || "—"}</span>
                <span className="text-brand-600 font-medium">{formatToman(l.price_per_kg)} ت/کیلو</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-2">درخواست‌های خرید (بازار معکوس)</p>
        {prLoading ? (
          <CenterLoading />
        ) : !purchaseRequests?.length ? (
          <p className="text-xs text-ink-400">درخواستی ثبت نشده است.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {purchaseRequests.slice(0, 15).map((pr: any) => (
              <div key={pr.uid} className="text-xs py-2 border-t border-brand-50 flex items-center justify-between">
                <span>{pr.material_detail?.name || pr.material} — {formatKg(pr.quantity_kg)}</span>
                <span className="text-ink-500">{pr.status}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

const IMPACT_CATEGORIES: ImpactCategory[] = ["EMPLOYMENT", "SOCIAL", "ENVIRONMENT", "LOCAL"];

function ImpactTab() {
  const { data: dashboard, isLoading: dashboardLoading } = useImpactDashboard();
  const { data: projects, isLoading: projectsLoading } = useImpactProjects();
  const [editingProject, setEditingProject] = useState<ImpactProject | "new" | null>(null);

  if (dashboardLoading || !dashboard) return <CenterLoading />;

  const categoryData = IMPACT_CATEGORIES.map((cat) => ({
    نام: IMPACT_CATEGORY_LABELS[cat],
    تومان: dashboard.category_totals[cat] || 0,
  }));
  const monthlyData = (dashboard.monthly || []).map((m) => ({ ماه: m.month, تومان: m.total }));

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-1">داشبورد اثر سبز</p>
        <p className="text-[11px] text-ink-500 leading-5">
          مجموع مشارکت‌های داوطلبانهٔ شهروندان — تمام مبالغ از طریق دفتر کل کیف پول موجود (همان لجر واریز/برداشت) کسر و ثبت شده‌اند.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3.5 text-center">
          <p className="text-lg font-extrabold text-brand-600">{formatToman(dashboard.total_waste_value)}</p>
          <p className="text-[10.5px] text-ink-500 mt-1">ارزش کل پسماند (ت)</p>
        </Card>
        <Card className="p-3.5 text-center">
          <p className="text-lg font-extrabold text-brand-600">{formatToman(dashboard.total_contributed)}</p>
          <p className="text-[10.5px] text-ink-500 mt-1">مجموع مشارکت اثر سبز (ت)</p>
        </Card>
        <Card className="p-3.5 text-center">
          <p className="text-lg font-extrabold text-ink-900">{formatNumber(dashboard.participants)}</p>
          <p className="text-[10.5px] text-ink-500 mt-1">کاربران مشارکت‌کننده</p>
        </Card>
        <Card className="p-3.5 text-center">
          <p className="text-lg font-extrabold text-ink-900">{formatNumber(dashboard.active_projects)} / {formatNumber(dashboard.total_projects)}</p>
          <p className="text-[10.5px] text-ink-500 mt-1">طرح‌های فعال / کل</p>
        </Card>
      </div>

      <ChartCard title="مشارکت به تفکیک دسته">
        {categoryData.some((c) => c["تومان"] > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" />
              <XAxis dataKey="نام" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString("fa-IR")} تومان`} />
              <Bar dataKey="تومان" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <NoData />}
      </ChartCard>

      <ChartCard title="روند مشارکت ماهانه">
        {monthlyData.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" />
              <XAxis dataKey="ماه" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString("fa-IR")} تومان`} />
              <Line type="monotone" dataKey="تومان" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <NoData />}
      </ChartCard>

      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-2">مشارکت به تفکیک طرح</p>
        {!dashboard.by_project.length ? (
          <p className="text-xs text-ink-400">هنوز مشارکتی ثبت نشده است.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {dashboard.by_project.map((row) => (
              <div key={row.project_uid} className="text-xs py-2 border-t border-brand-50 flex items-center justify-between">
                <span>{row.project_icon} {row.project_title}</span>
                <span className="text-ink-500">{formatNumber(row.contributors)} نفر — <span className="text-brand-600 font-medium">{formatToman(row.total)} ت</span></span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-2">مشارکت به تفکیک شهر/منطقه</p>
        {!dashboard.by_city.length ? (
          <p className="text-xs text-ink-400">داده‌ای موجود نیست.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {dashboard.by_city.map((row) => (
              <div key={row.city} className="text-xs py-2 border-t border-brand-50 flex items-center justify-between">
                <span>{row.city}</span>
                <span className="text-ink-500">{formatNumber(row.contributors)} نفر — <span className="text-brand-600 font-medium">{formatToman(row.total)} ت</span></span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-ink-900">مدیریت طرح‌های اثر سبز</p>
          <Button variant="secondary" className="!py-1.5 !px-3 !text-xs" onClick={() => setEditingProject("new")}>
            + طرح جدید
          </Button>
        </div>
        {projectsLoading ? (
          <CenterLoading />
        ) : !projects?.length ? (
          <p className="text-xs text-ink-400">هنوز طرحی ثبت نشده است.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map((p) => (
              <div key={p.uid} className="rounded-xl border border-brand-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {p.icon} {p.title} {p.is_demo && <span className="text-[9.5px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full mr-1">نمونه</span>}
                  </span>
                  <button className="text-[11px] text-brand-600 font-medium" onClick={() => setEditingProject(p)}>
                    ویرایش
                  </button>
                </div>
                <p className="text-[10.5px] text-ink-500 mt-1">
                  {IMPACT_CATEGORY_LABELS[p.category]} · وضعیت: {p.status_display} · جمع‌آوری‌شده: {formatToman(p.raised_amount)} ت
                  {p.goal_amount ? ` از ${formatToman(p.goal_amount)} ت` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editingProject && <ImpactProjectEditor project={editingProject} onClose={() => setEditingProject(null)} />}
    </div>
  );
}

function ImpactProjectEditor({ project, onClose }: { project: ImpactProject | "new"; onClose: () => void }) {
  const isNew = project === "new";
  const createProject = useCreateImpactProject();
  const updateProject = useUpdateImpactProject();

  const [form, setForm] = useState({
    title: isNew ? "" : project.title,
    category: isNew ? "ENVIRONMENT" : project.category,
    icon: isNew ? "🌱" : project.icon,
    summary: isNew ? "" : project.summary,
    description: isNew ? "" : project.description,
    operator_name: isNew ? "" : project.operator_name,
    goal_amount: isNew ? "" : project.goal_amount || "",
    status: isNew ? "ACTIVE" : project.status,
    progress_report: isNew ? "" : project.progress_report,
  });

  const mutation = isNew ? createProject : updateProject;
  const error = (createProject.error || updateProject.error) as Error | undefined;

  async function handleSave() {
    const payload = { ...form, goal_amount: form.goal_amount ? form.goal_amount : null };
    if (isNew) {
      await createProject.mutateAsync(payload as any);
    } else {
      await updateProject.mutateAsync({ uid: (project as ImpactProject).uid, payload: payload as any });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 max-h-[85vh] overflow-y-auto">
        <p className="text-sm font-bold text-ink-900 mb-3">{isNew ? "طرح اثر سبز جدید" : "ویرایش طرح"}</p>
        <div className="flex flex-col gap-2.5">
          <input className="rounded-lg border border-brand-100 px-3 py-2 text-sm" placeholder="عنوان طرح"
            value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <select className="rounded-lg border border-brand-100 px-2.5 py-2 text-xs"
              value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ImpactCategory }))}>
              {IMPACT_CATEGORIES.map((c) => <option key={c} value={c}>{IMPACT_CATEGORY_LABELS[c]}</option>)}
            </select>
            <input className="rounded-lg border border-brand-100 px-2.5 py-2 text-xs text-center" placeholder="ایموجی"
              value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} />
          </div>
          <input className="rounded-lg border border-brand-100 px-3 py-2 text-sm" placeholder="خلاصهٔ یک‌خطی"
            value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
          <textarea className="rounded-lg border border-brand-100 px-3 py-2 text-sm" rows={2} placeholder="توضیح کامل هدف طرح"
            value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <input className="rounded-lg border border-brand-100 px-3 py-2 text-sm" placeholder="مجری / مجموعهٔ مسئول"
            value={form.operator_name} onChange={(e) => setForm((f) => ({ ...f, operator_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <input className="rounded-lg border border-brand-100 px-2.5 py-2 text-xs" inputMode="numeric" placeholder="مبلغ هدف (خالی = بدون سقف)"
              value={form.goal_amount} onChange={(e) => setForm((f) => ({ ...f, goal_amount: e.target.value }))} />
            <select className="rounded-lg border border-brand-100 px-2.5 py-2 text-xs"
              value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ImpactProject["status"] }))}>
              <option value="ACTIVE">فعال</option>
              <option value="PAUSED">متوقف</option>
              <option value="COMPLETED">تکمیل‌شده</option>
            </select>
          </div>
          <textarea className="rounded-lg border border-brand-100 px-3 py-2 text-sm" rows={2} placeholder="گزارش پیشرفت (اختیاری)"
            value={form.progress_report} onChange={(e) => setForm((f) => ({ ...f, progress_report: e.target.value }))} />
        </div>
        {error && <p className="text-red-600 text-xs mt-2">{error.message}</p>}
        <div className="flex gap-2 mt-4">
          <Button variant="secondary" onClick={onClose}>انصراف</Button>
          <Button full loading={mutation.isPending} disabled={!form.title} onClick={handleSave}>ذخیره</Button>
        </div>
      </div>
    </div>
  );
}

function ToolsTab() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useGlobalSearch(q);
  const [exporting, setExporting] = useState<"collections" | "orders" | null>(null);

  async function handleExport(type: "collections" | "orders") {
    setExporting(type);
    try {
      await downloadAdminExport(type);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-2">جستجوی سراسری</p>
        <input
          className="w-full rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
          placeholder="نام، شماره موبایل، کد درخواست یا کد سفارش..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {isLoading && q.trim().length > 1 && <p className="text-xs text-ink-400 mt-3">در حال جستجو...</p>}

        {data && (data.users.length + data.requests.length + data.orders.length === 0) && q.trim().length > 1 && (
          <p className="text-xs text-ink-400 mt-3">نتیجه‌ای یافت نشد.</p>
        )}

        {data && data.users.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-bold text-ink-500 mb-1.5">کاربران</p>
            {data.users.map((u) => (
              <div key={u.id} className="text-xs py-1.5 border-t border-brand-50 flex justify-between">
                <span>{u.name}</span>
                <span className="text-ink-400" dir="ltr">{u.phone || u.email}</span>
              </div>
            ))}
          </div>
        )}

        {data && data.requests.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-bold text-ink-500 mb-1.5">درخواست‌های جمع‌آوری</p>
            {data.requests.map((r) => (
              <div key={r.uid} className="text-xs py-1.5 border-t border-brand-50 flex justify-between">
                <span>{r.code} — {r.citizen}</span>
                <span className="text-ink-400">{r.status}</span>
              </div>
            ))}
          </div>
        )}

        {data && data.orders.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-bold text-ink-500 mb-1.5">سفارش‌های بازارگاه</p>
            {data.orders.map((o) => (
              <div key={o.uid} className="text-xs py-1.5 border-t border-brand-50 flex justify-between">
                <span>{o.code} — {o.buyer} ← {o.seller}</span>
                <span className="text-ink-400">{formatToman(o.total)} ت</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-2">خروجی CSV</p>
        <p className="text-[11px] text-ink-500 mb-3">خروجی برای بازکردن در اکسل (حداکثر ۵۰۰۰ ردیف اخیر).</p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            loading={exporting === "collections"}
            onClick={() => handleExport("collections")}
          >
            درخواست‌های جمع‌آوری
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            loading={exporting === "orders"}
            onClick={() => handleExport("orders")}
          >
            سفارش‌های بازارگاه
          </Button>
        </div>
      </Card>
    </div>
  );
}

function VerificationTab() {
  const { data, isLoading } = useVerificationCenter();
  const decide = useDecideVerification();

  if (isLoading) return <CenterLoading />;
  if (!data?.items.length) return <EmptyState icon="✅" title="چیزی در انتظار تأیید نیست" />;

  return (
    <div className="flex flex-col gap-3 pb-6">
      {data.items.map((item) => (
        <Card key={`${item.type}-${item.id}`} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] bg-slate-100 text-ink-600 px-2 py-0.5 rounded-full">{TYPE_LABELS[item.type] || item.type}</span>
              <p className="font-bold text-sm text-ink-900 mt-1.5">{item.label}</p>
              <p className="text-xs text-ink-500 mt-0.5">{item.detail}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="secondary"
              className="flex-1"
              loading={decide.isPending}
              onClick={() => decide.mutate({ url: item.approve_url })}
            >
              ✅ تأیید
            </Button>
            {item.reject_url && (
              <Button
                variant="danger"
                className="flex-1"
                loading={decide.isPending}
                onClick={() => decide.mutate({ url: item.reject_url! })}
              >
                ❌ رد
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  collector: "جمع‌آور", organization: "مشتری سازمانی", recycling_center: "مرکز بازیافت",
  factory: "کارخانه", wholesaler: "خریدار عمده", business: "کسب‌وکار", profile_change: "تغییر پروفایل",
};

function ChartsTab() {
  const { data, isLoading } = useAdminCharts(30);
  if (isLoading || !data) return <CenterLoading />;

  const requestsData = (data.requests_by_day || []).map((d: any) => ({ day: jalaliDay(d.day), تعداد: d.count }));
  const weightData = (data.weight_by_day || []).map((d: any) => ({ day: jalaliDay(d.day), "کیلوگرم": Number(d.total) }));
  const salesData = (data.sales_by_day || []).map((d: any) => ({ day: jalaliDay(d.day), "تومان": Number(d.total) }));
  const inventoryData = (data.inventory_by_day || []).map((d: any) => ({ day: jalaliDay(d.day), ورود: Number(d.in_kg), خروج: Number(d.out_kg) }));

  return (
    <div className="flex flex-col gap-5 pb-6">
      <ChartCard title="روند درخواست‌های جمع‌آوری (۳۰ روز اخیر)">
        {requestsData.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={requestsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" />
              <XAxis dataKey="day" fontSize={10} />
              <YAxis fontSize={10} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="تعداد" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <NoData />}
      </ChartCard>

      <ChartCard title="روند فروش (تومان)">
        {salesData.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" />
              <XAxis dataKey="day" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString("fa-IR")} تومان`} />
              <Bar dataKey="تومان" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <NoData />}
      </ChartCard>

      <ChartCard title="ورود / خروج پسماند کسب‌وکارها (کیلوگرم)">
        {inventoryData.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={inventoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" />
              <XAxis dataKey="day" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ورود" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="خروج" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <NoData />}
      </ChartCard>

      <ChartCard title="روند وزن جمع‌آوری‌شده (کیلوگرم)">
        {weightData.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" />
              <XAxis dataKey="day" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Line type="monotone" dataKey="کیلوگرم" stroke={CHART_COLORS.muted} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <NoData />}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-bold text-ink-900 mb-2">{title}</p>
      {children}
    </Card>
  );
}

function NoData() {
  return <p className="text-xs text-ink-400 text-center py-10">داده‌ای برای این بازه ثبت نشده است.</p>;
}
