import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import {
  downloadAdminExport, useAdminCharts, useDecideVerification, useGlobalSearch, useVerificationCenter,
  useAdminPricing, useSetPrice, useAllCities, useUpdateCity, useChallenges, useListings, useAdminPurchaseRequests,
  useImpactDashboard, useImpactProjects, useCreateImpactProject, useUpdateImpactProject,
  useAdminCollectors, useSuspendCollector, useReactivateCollector,
  useAdminWithdrawals, useDecideWithdrawal,
  useAdminRequests, useAdminEditRequest, useAdminCancelRequest, useAdminOverrideWeighing,
  useAdminStorePartners, useCreateStorePartner, useUpdateStorePartner, useAdminStoreRedemptions, useDecideStoreRedemption,
  useStations, useNearbyCollectorsMap,
} from "../api/queries";
import { Button, Card, CenterLoading, DemoBadge, EmptyState, TopBar } from "../components/ui";
import { formatKg, formatNumber, formatToman, toJalali } from "../lib/format";
import {
  IMPACT_CATEGORY_LABELS, type ImpactCategory, type ImpactProject, type AdminCollector, type AdminWithdrawal,
  type CollectionRequest, type StorePartnerCategory, type AdminStoreRedemption,
} from "../api/types";
import brandmark from "../assets/brand/brandmark-256.png";

const CHART_COLORS = { primary: "#16a34a", secondary: "#0ea5e9", danger: "#dc2626", muted: "#94a3b8" };

function jalaliDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fa-IR", { month: "2-digit", day: "2-digit" });
  } catch {
    return iso;
  }
}

type Tab =
  | "overview" | "verification" | "charts" | "prices" | "missions" | "cities" | "b2b" | "impact" | "tools"
  | "drivers" | "withdrawals" | "requests" | "store" | "map";

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
              ["requests", "📋 درخواست‌های جمع‌آوری"],
              ["map", "🗺️ نقشه زنده"],
              ["drivers", "🚚 حساب رانندگان"],
              ["withdrawals", "💳 برداشت وجه"],
              ["store", "🛍️ فروشگاه سبزینو"],
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
        {isStaff && tab === "requests" && <RequestsTab />}
        {isStaff && tab === "map" && <LiveMapTab />}
        {isStaff && tab === "drivers" && <DriversTab />}
        {isStaff && tab === "withdrawals" && <WithdrawalsTab />}
        {isStaff && tab === "store" && <StoreTab />}
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

function ReasonModal({
  title, placeholder, loading, error, onCancel, onSubmit,
}: {
  title: string; placeholder: string; loading: boolean; error?: string;
  onCancel: () => void; onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5">
        <p className="text-sm font-bold text-ink-900 mb-3">{title}</p>
        <textarea
          className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm"
          rows={3}
          placeholder={placeholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
        />
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>انصراف</Button>
          <Button variant="danger" className="flex-1" loading={loading} disabled={!note.trim()} onClick={() => onSubmit(note.trim())}>
            ثبت
          </Button>
        </div>
      </div>
    </div>
  );
}

const COLLECTOR_STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار بررسی", UNDER_REVIEW: "در حال بررسی", APPROVED: "تأیید شده", REJECTED: "رد شده", SUSPENDED: "معلق",
};
const COLLECTOR_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700", UNDER_REVIEW: "bg-sky-50 text-sky-700",
  APPROVED: "bg-brand-50 text-brand-700", REJECTED: "bg-slate-100 text-ink-500", SUSPENDED: "bg-red-50 text-red-700",
};

function DriversTab() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data, isLoading } = useAdminCollectors(statusFilter ? { verification_status: statusFilter } : undefined);
  const suspend = useSuspendCollector();
  const reactivate = useReactivateCollector();
  const [suspendTarget, setSuspendTarget] = useState<AdminCollector | null>(null);

  return (
    <div className="flex flex-col gap-3 pb-6">
      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-1">مدیریت حساب رانندگان (جمع‌آوران)</p>
        <p className="text-[11px] text-ink-500 leading-5">
          حساب یک راننده را در هر زمان — مثلاً به‌دلیل تخلف یا شکایت مشتری — می‌توانید معلق کنید؛ بلافاصله آفلاین می‌شود و تا فعال‌سازی مجدد امکان پذیرش درخواست جدید ندارد.
        </p>
      </Card>

      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
        {[["", "همه"], ["APPROVED", "تأییدشده"], ["SUSPENDED", "معلق"], ["PENDING", "در انتظار"], ["REJECTED", "ردشده"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setStatusFilter(v)}
            className={`text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${statusFilter === v ? "bg-brand-500 text-white" : "bg-white text-ink-600 border border-brand-100"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <CenterLoading />
      ) : !data?.length ? (
        <EmptyState icon="🚚" title="راننده‌ای یافت نشد" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-ink-900">{c.full_name || "بدون نام"}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5" dir="ltr">{c.user_phone}</p>
                  <p className="text-[10.5px] text-ink-400 mt-0.5">{c.city}{c.service_area ? ` — ${c.service_area}` : ""}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${COLLECTOR_STATUS_COLORS[c.verification_status] || "bg-slate-100 text-ink-500"}`}>
                  {COLLECTOR_STATUS_LABELS[c.verification_status] || c.verification_status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10.5px] text-ink-500">
                <span>✅ {formatNumber(c.completed_jobs)} کار تکمیل‌شده</span>
                <span>⭐ {c.rating_avg}</span>
                <span>{c.is_online ? "🟢 آنلاین" : "⚪ آفلاین"}</span>
              </div>
              {c.verification_note && <p className="text-[10.5px] text-ink-400 mt-1.5">یادداشت: {c.verification_note}</p>}
              {(c.verification_status === "SUSPENDED" || c.verification_status === "APPROVED") && (
                <div className="flex gap-2 mt-3">
                  {c.verification_status === "SUSPENDED" ? (
                    <Button
                      variant="secondary" className="flex-1 !py-2 !text-xs" loading={reactivate.isPending}
                      onClick={() => reactivate.mutate({ id: c.id })}
                    >
                      فعال‌سازی مجدد
                    </Button>
                  ) : (
                    <Button variant="danger" className="flex-1 !py-2 !text-xs" onClick={() => setSuspendTarget(c)}>
                      تعلیق حساب
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {suspendTarget && (
        <ReasonModal
          title={`تعلیق حساب ${suspendTarget.full_name || "راننده"}`}
          placeholder="دلیل تعلیق را بنویسید (الزامی)..."
          loading={suspend.isPending}
          error={(suspend.error as Error | undefined)?.message}
          onCancel={() => setSuspendTarget(null)}
          onSubmit={(note) => suspend.mutate({ id: suspendTarget.id, note }, { onSuccess: () => setSuspendTarget(null) })}
        />
      )}
    </div>
  );
}

const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار بررسی", APPROVED: "تأییدشده — منتظر واریز", REJECTED: "رد شده", PAID: "پرداخت شد",
};
const WITHDRAWAL_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700", APPROVED: "bg-sky-50 text-sky-700",
  REJECTED: "bg-slate-100 text-ink-500", PAID: "bg-brand-50 text-brand-700",
};

function WithdrawalsTab() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const { data, isLoading } = useAdminWithdrawals(statusFilter ? { status: statusFilter } : undefined);
  const decide = useDecideWithdrawal();
  const [rejectTarget, setRejectTarget] = useState<AdminWithdrawal | null>(null);

  return (
    <div className="flex flex-col gap-3 pb-6">
      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-1">درخواست‌های برداشت وجه</p>
        <p className="text-[11px] text-ink-500 leading-5">
          واریز واقعی به شماره شبا همچنان یک عملیات دستی بانکی است: پس از «تأیید»، مبلغ را به شماره شبا واریز کنید و سپس «پرداخت‌شد» را ثبت کنید. با «رد»، مبلغ به‌طور خودکار به کیف‌پول کاربر بازمی‌گردد.
        </p>
      </Card>

      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
        {[["", "همه"], ["PENDING", "در انتظار"], ["APPROVED", "تأییدشده"], ["PAID", "پرداخت‌شده"], ["REJECTED", "ردشده"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setStatusFilter(v)}
            className={`text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${statusFilter === v ? "bg-brand-500 text-white" : "bg-white text-ink-600 border border-brand-100"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <CenterLoading />
      ) : !data?.length ? (
        <EmptyState icon="💳" title="درخواستی یافت نشد" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.map((w) => (
            <Card key={w.uid} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-ink-900">{w.user_name}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5" dir="ltr">{w.user_phone}</p>
                  <p className="text-[10.5px] text-ink-400 mt-0.5" dir="ltr">شبا: {w.sheba_number || "—"}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${WITHDRAWAL_STATUS_COLORS[w.status]}`}>
                  {WITHDRAWAL_STATUS_LABELS[w.status]}
                </span>
              </div>
              <p className="text-base font-extrabold text-brand-700 mt-2">{formatToman(w.amount)} تومان</p>
              <p className="text-[10.5px] text-ink-400 mt-0.5">{toJalali(w.created_at)}</p>
              {w.note && <p className="text-[10.5px] text-ink-400 mt-1">یادداشت: {w.note}</p>}
              {w.status === "PENDING" && (
                <div className="flex gap-2 mt-3">
                  <Button
                    className="flex-1 !py-2 !text-xs" loading={decide.isPending}
                    onClick={() => decide.mutate({ uid: w.uid, action: "approve" })}
                  >
                    ✅ تأیید
                  </Button>
                  <Button variant="danger" className="flex-1 !py-2 !text-xs" onClick={() => setRejectTarget(w)}>
                    ❌ رد
                  </Button>
                </div>
              )}
              {w.status === "APPROVED" && (
                <Button full className="mt-3 !py-2 !text-xs" loading={decide.isPending} onClick={() => decide.mutate({ uid: w.uid, action: "mark_paid" })}>
                  💸 پرداخت‌شد (پس از واریز بانکی)
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {rejectTarget && (
        <ReasonModal
          title={`رد درخواست برداشت ${rejectTarget.user_name}`}
          placeholder="دلیل رد را بنویسید..."
          loading={decide.isPending}
          error={(decide.error as Error | undefined)?.message}
          onCancel={() => setRejectTarget(null)}
          onSubmit={(note) => decide.mutate({ uid: rejectTarget.uid, action: "reject", note }, { onSuccess: () => setRejectTarget(null) })}
        />
      )}
    </div>
  );
}

const STORE_CATEGORY_LABELS: Record<StorePartnerCategory, string> = {
  FOOD: "خوراکی و سوپرمارکت", HOUSEHOLD: "لوازم خانه", DIGITAL: "دیجیتال و شارژ",
  HEALTH: "سلامت و آرایشی", SERVICES: "خدمات", OTHER: "سایر",
};
const STORE_REDEMPTION_STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار بررسی", APPROVED: "تأییدشده — کد صادر شد", REJECTED: "رد شده", FULFILLED: "استفاده‌شده",
};
const STORE_REDEMPTION_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700", APPROVED: "bg-sky-50 text-sky-700",
  REJECTED: "bg-slate-100 text-ink-500", FULFILLED: "bg-brand-50 text-brand-700",
};

function StoreTab() {
  const [sub, setSub] = useState<"partners" | "redemptions">("partners");
  return (
    <div className="flex flex-col gap-3 pb-6">
      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-1">فروشگاه سبزینو</p>
        <p className="text-[11px] text-ink-500 leading-5">
          فروشگاه‌های همکارِ واقعی شهر را اینجا ثبت کنید تا شهروندان بتوانند با موجودی کیف‌پول‌شان از آن‌ها خرید کنند؛ هیچ فروشگاهی به‌صورت خودکار اضافه نمی‌شود. درخواست‌های خرید هم مثل برداشت وجه به‌صورت نیمه‌دستی بررسی می‌شوند.
        </p>
      </Card>

      <div className="flex gap-1.5">
        <button
          onClick={() => setSub("partners")}
          className={`flex-1 text-xs px-3 py-2 rounded-lg font-medium ${sub === "partners" ? "bg-brand-500 text-white" : "bg-white text-ink-600 border border-brand-100"}`}
        >
          🏪 فروشگاه‌های همکار
        </button>
        <button
          onClick={() => setSub("redemptions")}
          className={`flex-1 text-xs px-3 py-2 rounded-lg font-medium ${sub === "redemptions" ? "bg-brand-500 text-white" : "bg-white text-ink-600 border border-brand-100"}`}
        >
          🧾 درخواست‌های خرید
        </button>
      </div>

      {sub === "partners" ? <StorePartnersSubTab /> : <StoreRedemptionsSubTab />}
    </div>
  );
}

function PartnerFormModal({ onClose }: { onClose: () => void }) {
  const create = useCreateStorePartner();
  const [form, setForm] = useState({
    name: "", category: "OTHER" as StorePartnerCategory, description: "",
    address: "", contact_phone: "", redeem_instructions: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 max-h-[85vh] overflow-y-auto">
        <p className="text-sm font-bold text-ink-900 mb-3">افزودن فروشگاه همکار واقعی</p>
        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <input
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
            placeholder="نام فروشگاه (واقعی)" value={form.name} onChange={(e) => update("name", e.target.value)} required
          />
          <select
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
            value={form.category} onChange={(e) => update("category", e.target.value as StorePartnerCategory)}
          >
            {Object.entries(STORE_CATEGORY_LABELS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
          <input
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
            placeholder="توضیح کوتاه (اختیاری)" value={form.description} onChange={(e) => update("description", e.target.value)}
          />
          <input
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
            placeholder="آدرس (اختیاری)" value={form.address} onChange={(e) => update("address", e.target.value)}
          />
          <input
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm" dir="ltr"
            placeholder="شماره تماس (اختیاری)" value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)}
          />
          <textarea
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm" rows={2}
            placeholder="راهنمای استفاده برای شهروند (اختیاری) — مثلاً «کد را هنگام خرید نشان دهید»"
            value={form.redeem_instructions} onChange={(e) => update("redeem_instructions", e.target.value)}
          />
          {create.error && <p className="text-red-600 text-xs">{(create.error as Error).message}</p>}
          <div className="flex gap-2 mt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>انصراف</Button>
            <Button type="submit" className="flex-1" loading={create.isPending}>افزودن</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StorePartnersSubTab() {
  const { data, isLoading } = useAdminStorePartners();
  const update = useUpdateStorePartner();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-2.5">
      <Button onClick={() => setShowForm(true)} className="!py-2.5 !text-xs">➕ افزودن فروشگاه همکار</Button>

      {isLoading ? (
        <CenterLoading />
      ) : !data?.length ? (
        <EmptyState icon="🏪" title="هنوز فروشگاهی ثبت نشده" subtitle="فروشگاه‌های همکار واقعی را از همین‌جا اضافه کنید." />
      ) : (
        data.map((p) => (
          <Card key={p.uid} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-900">{p.name}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">{STORE_CATEGORY_LABELS[p.category]}</p>
                {p.description && <p className="text-[10.5px] text-ink-400 mt-1">{p.description}</p>}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${p.is_active ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-ink-500"}`}>
                {p.is_active ? "فعال" : "غیرفعال"}
              </span>
            </div>
            <Button
              variant={p.is_active ? "danger" : "secondary"} full className="mt-3 !py-2 !text-xs" loading={update.isPending}
              onClick={() => update.mutate({ uid: p.uid, is_active: !p.is_active })}
            >
              {p.is_active ? "غیرفعال کردن" : "فعال کردن"}
            </Button>
          </Card>
        ))
      )}

      {showForm && <PartnerFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}

function StoreRedemptionsSubTab() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const { data, isLoading } = useAdminStoreRedemptions(statusFilter ? { status: statusFilter } : undefined);
  const decide = useDecideStoreRedemption();
  const [rejectTarget, setRejectTarget] = useState<AdminStoreRedemption | null>(null);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
        {[["", "همه"], ["PENDING", "در انتظار"], ["APPROVED", "تأییدشده"], ["FULFILLED", "استفاده‌شده"], ["REJECTED", "ردشده"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setStatusFilter(v)}
            className={`text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${statusFilter === v ? "bg-brand-500 text-white" : "bg-white text-ink-600 border border-brand-100"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <CenterLoading />
      ) : !data?.length ? (
        <EmptyState icon="🧾" title="درخواستی یافت نشد" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.map((r) => (
            <Card key={r.uid} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-ink-900">{r.user_name}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5" dir="ltr">{r.user_phone}</p>
                  <p className="text-[10.5px] text-ink-400 mt-0.5">فروشگاه: {r.partner_name}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${STORE_REDEMPTION_STATUS_COLORS[r.status]}`}>
                  {STORE_REDEMPTION_STATUS_LABELS[r.status]}
                </span>
              </div>
              <p className="text-base font-extrabold text-brand-700 mt-2">{formatToman(r.amount)} تومان</p>
              <p className="text-[10.5px] text-ink-400 mt-0.5">{toJalali(r.created_at)}</p>
              {r.redemption_code && <p className="text-[10.5px] text-sky-700 mt-1" dir="ltr">کد: {r.redemption_code}</p>}
              {r.note && <p className="text-[10.5px] text-ink-400 mt-1">یادداشت: {r.note}</p>}
              {r.status === "PENDING" && (
                <div className="flex gap-2 mt-3">
                  <Button
                    className="flex-1 !py-2 !text-xs" loading={decide.isPending}
                    onClick={() => decide.mutate({ uid: r.uid, action: "approve" })}
                  >
                    ✅ تأیید و صدور کد
                  </Button>
                  <Button variant="danger" className="flex-1 !py-2 !text-xs" onClick={() => setRejectTarget(r)}>
                    ❌ رد
                  </Button>
                </div>
              )}
              {r.status === "APPROVED" && (
                <Button full className="mt-3 !py-2 !text-xs" loading={decide.isPending} onClick={() => decide.mutate({ uid: r.uid, action: "mark_fulfilled" })}>
                  📦 استفاده‌شد (پس از خرید حضوری)
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {rejectTarget && (
        <ReasonModal
          title={`رد درخواست خرید ${rejectTarget.user_name}`}
          placeholder="دلیل رد را بنویسید..."
          loading={decide.isPending}
          error={(decide.error as Error | undefined)?.message}
          onCancel={() => setRejectTarget(null)}
          onSubmit={(note) => decide.mutate({ uid: rejectTarget.uid, action: "reject", note }, { onSuccess: () => setRejectTarget(null) })}
        />
      )}
    </div>
  );
}

const REQUEST_STATUS_OPTIONS: [string, string][] = [
  ["", "همه"], ["SEARCHING_COLLECTOR", "در جستجوی جمع‌آور"], ["ACCEPTED", "پذیرفته‌شده"],
  ["ON_THE_WAY", "در مسیر"], ["COLLECTED", "جمع‌آوری‌شده"], ["COMPLETED", "تکمیل‌شده"], ["CANCELLED", "لغوشده"],
];

const YASUJ_CENTER: [number, number] = [30.6683, 51.5877];

function pinIcon(color: string, emoji: string) {
  return new L.DivIcon({
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3)"><span style="transform:rotate(45deg);font-size:13px">${emoji}</span></div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

const stationMapIcon = pinIcon("#16a34a", "♻️");
const collectorMapIcon = pinIcon("#2563eb", "🚚");
const pendingRequestMapIcon = pinIcon("#dc2626", "📦");

/**
 * فاز ۱۰: نقشه زنده‌ی ادمین — همان دیتاهایی که در نقشه‌ی شهروند (Stations.tsx)
 * هست (ایستگاه‌ها + جمع‌آورهای آنلاین) به‌علاوه درخواست‌های در انتظار جمع‌آور،
 * تا ادمین یک نمای عملیاتی لحظه‌ای از کل شهر داشته باشد.
 */
function LiveMapTab() {
  const { data: stations, isLoading: stationsLoading } = useStations();
  const { data: collectors, isLoading: collectorsLoading } = useNearbyCollectorsMap();
  const { data: pendingRequests, isLoading: requestsLoading } = useAdminRequests({ status: "SEARCHING_COLLECTOR" });

  const isLoading = stationsLoading || collectorsLoading || requestsLoading;
  const onlineCount = (collectors || []).filter((c) => c.lat && c.lng).length;
  const pendingCount = (pendingRequests || []).filter((r) => r.lat && r.lng).length;

  return (
    <div className="flex flex-col gap-3 pb-6">
      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-1">نقشه زنده عملیات</p>
        <p className="text-[11px] text-ink-500 leading-5">
          موقعیت لحظه‌ای جمع‌آورهای آنلاین، مراکز بازیافت و درخواست‌های در انتظار پذیرش — این نقشه هر چند ثانیه یک‌بار به‌روزرسانی می‌شود.
        </p>
      </Card>

      <div className="flex items-center gap-3">
        <Card className="p-3 flex-1 text-center">
          <p className="text-lg font-bold text-blue-600">{isLoading ? "—" : onlineCount}</p>
          <p className="text-[10.5px] text-ink-500">جمع‌آور آنلاین</p>
        </Card>
        <Card className="p-3 flex-1 text-center">
          <p className="text-lg font-bold text-red-600">{isLoading ? "—" : pendingCount}</p>
          <p className="text-[10.5px] text-ink-500">درخواست در انتظار</p>
        </Card>
        <Card className="p-3 flex-1 text-center">
          <p className="text-lg font-bold text-brand-600">{isLoading ? "—" : (stations || []).length}</p>
          <p className="text-[10.5px] text-ink-500">مرکز بازیافت</p>
        </Card>
      </div>

      <Card className="overflow-hidden h-[420px]">
        <MapContainer center={YASUJ_CENTER} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {(stations || []).map(
            (s) =>
              s.lat &&
              s.lng && (
                <Marker key={`st-${s.uid}`} position={[Number(s.lat), Number(s.lng)]} icon={stationMapIcon}>
                  <Popup>
                    <b>{s.name}</b>
                    <br />
                    {s.address}
                  </Popup>
                </Marker>
              )
          )}
          {(collectors || []).map((c) => {
            const lat = Number(c.lat);
            const lng = Number(c.lng);
            if (!c.lat || !c.lng || Number.isNaN(lat) || Number.isNaN(lng)) return null;
            return (
              <Marker key={`col-${c.id}`} position={[lat, lng]} icon={collectorMapIcon}>
                <Popup>
                  <b>{c.name}</b>
                  <br />⭐ {c.rating_avg}
                </Popup>
              </Marker>
            );
          })}
          {(pendingRequests || []).map((r) => {
            const lat = Number(r.lat);
            const lng = Number(r.lng);
            if (!r.lat || !r.lng || Number.isNaN(lat) || Number.isNaN(lng)) return null;
            return (
              <Marker key={`req-${r.uid}`} position={[lat, lng]} icon={pendingRequestMapIcon}>
                <Popup>
                  <b>#{r.code}</b>
                  <br />
                  {r.address_text_snapshot}
                  <br />
                  {formatToman(r.estimated_value)} ت (تخمینی)
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1 text-[11px] text-ink-500">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#16a34a" }} />
          مراکز بازیافت
        </span>
        <span className="flex items-center gap-1 text-[11px] text-ink-500">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#2563eb" }} />
          جمع‌آورهای آنلاین
        </span>
        <span className="flex items-center gap-1 text-[11px] text-ink-500">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#dc2626" }} />
          درخواست در انتظار جمع‌آور
        </span>
      </div>
    </div>
  );
}

function RequestsTab() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (search.trim().length > 1) params.search = search.trim();
  const { data, isLoading } = useAdminRequests(params);

  return (
    <div className="flex flex-col gap-3 pb-6">
      <Card className="p-4">
        <p className="text-sm font-bold text-ink-900 mb-1">رصد و اصلاح درخواست‌های جمع‌آوری</p>
        <p className="text-[11px] text-ink-500 leading-5">
          آدرس/توضیحات یک درخواست را اصلاح کنید، در صورت نیاز لغوش کنید، یا اگر وزن‌کشیِ تکمیل‌شده اشتباه ثبت شده، آن را با ذکر دلیل اصلاح کنید — هر اصلاح با دلیل، در تاریخچهٔ درخواست ثبت می‌شود و مبلغ کیف‌پول به‌صورت خودکار هم‌سو می‌شود.
        </p>
      </Card>

      <input
        className="w-full rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
        placeholder="جستجو بر اساس کد درخواست یا نام/موبایل شهروند..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
        {REQUEST_STATUS_OPTIONS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setStatusFilter(v)}
            className={`text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${statusFilter === v ? "bg-brand-500 text-white" : "bg-white text-ink-600 border border-brand-100"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <CenterLoading />
      ) : !data?.length ? (
        <EmptyState icon="📋" title="درخواستی یافت نشد" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.slice(0, 30).map((r) => (
            <RequestRow key={r.uid} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestRow({ request }: { request: CollectionRequest }) {
  const [panel, setPanel] = useState<"none" | "edit" | "cancel" | "override">("none");
  const editMut = useAdminEditRequest();
  const cancelMut = useAdminCancelRequest();
  const overrideMut = useAdminOverrideWeighing();

  const [addr, setAddr] = useState(request.address_text_snapshot);
  const [desc, setDesc] = useState(request.description);
  const [editReason, setEditReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [weight, setWeight] = useState(request.weighing?.weight_kg || "");
  const [overrideReason, setOverrideReason] = useState("");

  const isTerminal = request.status === "COMPLETED" || request.status === "CANCELLED";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-900">{request.code}</p>
          <p className="text-[11px] text-ink-500 mt-0.5 truncate">{request.address_text_snapshot}</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-ink-600 shrink-0">{request.status_display}</span>
      </div>
      {request.weighing && (
        <p className="text-[10.5px] text-ink-500 mt-1.5">
          وزن‌کشی: {request.weighing.weight_kg} کیلو — {formatToman(request.weighing.total_value)} تومان
        </p>
      )}

      <div className="flex gap-2 mt-3 flex-wrap">
        <Button variant="secondary" className="!py-1.5 !px-3 !text-[11px]" onClick={() => setPanel(panel === "edit" ? "none" : "edit")}>
          ✏️ اصلاح آدرس/توضیح
        </Button>
        {!isTerminal && (
          <Button variant="danger" className="!py-1.5 !px-3 !text-[11px]" onClick={() => setPanel(panel === "cancel" ? "none" : "cancel")}>
            ❌ لغو درخواست
          </Button>
        )}
        {request.weighing && (
          <Button variant="secondary" className="!py-1.5 !px-3 !text-[11px]" onClick={() => setPanel(panel === "override" ? "none" : "override")}>
            ⚖️ اصلاح وزن‌کشی
          </Button>
        )}
      </div>

      {panel === "edit" && (
        <div className="mt-3 pt-3 border-t border-brand-50 flex flex-col gap-2">
          <textarea className="rounded-lg border border-brand-100 px-3 py-2 text-xs" rows={2} placeholder="آدرس" value={addr} onChange={(e) => setAddr(e.target.value)} />
          <textarea className="rounded-lg border border-brand-100 px-3 py-2 text-xs" rows={2} placeholder="توضیحات" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <input className="rounded-lg border border-brand-100 px-3 py-2 text-xs" placeholder="دلیل اصلاح (الزامی)" value={editReason} onChange={(e) => setEditReason(e.target.value)} />
          {editMut.error && <p className="text-red-600 text-[11px]">{(editMut.error as Error).message}</p>}
          <div className="flex gap-2">
            <Button
              className="flex-1 !py-2 !text-xs" loading={editMut.isPending} disabled={!editReason.trim()}
              onClick={() => editMut.mutate(
                { uid: request.uid, reason: editReason, address_text_snapshot: addr, description: desc },
                { onSuccess: () => setPanel("none") },
              )}
            >
              ثبت اصلاح
            </Button>
            <Button variant="secondary" className="flex-1 !py-2 !text-xs" onClick={() => setPanel("none")}>انصراف</Button>
          </div>
        </div>
      )}

      {panel === "cancel" && (
        <div className="mt-3 pt-3 border-t border-brand-50 flex flex-col gap-2">
          <input className="rounded-lg border border-brand-100 px-3 py-2 text-xs" placeholder="دلیل لغو (الزامی)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          {cancelMut.error && <p className="text-red-600 text-[11px]">{(cancelMut.error as Error).message}</p>}
          <div className="flex gap-2">
            <Button
              variant="danger" className="flex-1 !py-2 !text-xs" loading={cancelMut.isPending} disabled={!cancelReason.trim()}
              onClick={() => cancelMut.mutate({ uid: request.uid, reason: cancelReason }, { onSuccess: () => setPanel("none") })}
            >
              تأیید لغو
            </Button>
            <Button variant="secondary" className="flex-1 !py-2 !text-xs" onClick={() => setPanel("none")}>انصراف</Button>
          </div>
        </div>
      )}

      {panel === "override" && request.weighing && (
        <div className="mt-3 pt-3 border-t border-brand-50 flex flex-col gap-2">
          <p className="text-[10.5px] text-ink-500">وزن فعلی: {request.weighing.weight_kg} کیلو — {formatToman(request.weighing.total_value)} تومان</p>
          <input className="rounded-lg border border-brand-100 px-3 py-2 text-xs" inputMode="decimal" placeholder="وزن اصلاح‌شده (کیلوگرم)" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <input className="rounded-lg border border-brand-100 px-3 py-2 text-xs" placeholder="دلیل اصلاح (الزامی)" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
          <p className="text-[10px] text-ink-400">مبلغ تسویه به‌صورت خودکار بر اساس قیمت زمان تحویل بازمحاسبه و تفاوت آن با کیف‌پول شهروند تسویه می‌شود.</p>
          {overrideMut.error && <p className="text-red-600 text-[11px]">{(overrideMut.error as Error).message}</p>}
          <div className="flex gap-2">
            <Button
              className="flex-1 !py-2 !text-xs" loading={overrideMut.isPending} disabled={!overrideReason.trim() || !weight}
              onClick={() => overrideMut.mutate(
                { uid: request.uid, weight_kg: Number(weight), reason: overrideReason },
                { onSuccess: () => setPanel("none") },
              )}
            >
              ثبت اصلاح وزن‌کشی
            </Button>
            <Button variant="secondary" className="flex-1 !py-2 !text-xs" onClick={() => setPanel("none")}>انصراف</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

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
