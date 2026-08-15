import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import { downloadAdminExport, useAdminCharts, useDecideVerification, useGlobalSearch, useVerificationCenter } from "../api/queries";
import { Button, Card, CenterLoading, DemoBadge, EmptyState, TopBar } from "../components/ui";
import { formatKg, formatNumber, formatToman } from "../lib/format";

const CHART_COLORS = { primary: "#16a34a", secondary: "#0ea5e9", danger: "#dc2626", muted: "#94a3b8" };

function jalaliDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fa-IR", { month: "2-digit", day: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.is_staff;
  const [tab, setTab] = useState<"overview" | "verification" | "charts" | "tools">("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const path = isStaff ? "/admin-dashboard/" : "/municipality/dashboard/";
      const { data } = await api.get(path);
      return data.dashboard;
    },
  });

  if (isLoading || !data) return <CenterLoading />;

  const kpis = isStaff
    ? [
        { label: "کل کاربران", value: formatNumber(data.total_users) },
        { label: "جمع‌آوران", value: formatNumber(data.collectors_total) },
        { label: "در انتظار تأیید", value: formatNumber(data.pending_verifications) },
        { label: "ایستگاه‌های فعال", value: formatNumber(data.stations_total) },
        { label: "مراکز بازیافت", value: formatNumber(data.recycling_centers_total) },
        { label: "کارخانه‌ها", value: formatNumber(data.factories_total) },
        { label: "خریداران عمده", value: formatNumber(data.wholesalers_total) },
        { label: "کل پسماند (کیلوگرم)", value: formatKg(data.total_waste_kg) },
        { label: "درخواست‌های جمع‌آوری", value: formatNumber(data.collection_requests_total) },
        { label: "سفارش‌ها (GMV)", value: `${formatToman(data.gmv_total)} ت` },
        { label: "درآمد پلتفرم", value: `${formatToman(data.platform_revenue_total)} ت` },
        { label: "موجودی کل کیف پول‌ها", value: `${formatToman(data.wallet_total_balance)} ت` },
      ]
    : [
        { label: "کل پسماند بازه (کیلوگرم)", value: formatKg(data.total_waste_kg) },
        { label: "درخواست‌های جمع‌آوری", value: formatNumber(data.collection_requests) },
        { label: "درخواست‌های تکمیل‌شده", value: formatNumber(data.completed_requests) },
        { label: "شهروندان فعال", value: formatNumber(data.active_participating_citizens) },
        { label: "ایستگاه‌های فعال", value: formatNumber(data.active_stations) },
        { label: "جمع‌آوران تأییدشده", value: formatNumber(data.approved_collectors) },
      ];

  return (
    <div>
      <TopBar title={isStaff ? "داشبورد مدیریت سبزینو" : "داشبورد شهرداری یاسوج"} right={<DemoBadge />} />

      {isStaff && (
        <div className="px-4 mb-3 flex gap-2">
          {([
            ["overview", "نمای کلی"],
            ["verification", `تأیید ثبت‌نام‌ها${data.pending_verifications ? ` (${data.pending_verifications})` : ""}`],
            ["charts", "نمودارها"],
            ["tools", "جستجو و خروجی"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-xs px-3 py-2 rounded-lg font-medium ${tab === key ? "bg-brand-500 text-white" : "bg-white text-ink-600 border border-brand-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="px-4">
        {(!isStaff || tab === "overview") && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {kpis.map((k) => (
                <Card key={k.label} className="p-4">
                  <p className="text-lg font-extrabold text-brand-600">{k.value}</p>
                  <p className="text-[11px] text-ink-500 mt-1">{k.label}</p>
                </Card>
              ))}
            </div>
            <p className="text-[11px] text-ink-400 mt-4 leading-5">
              مدیریت کامل کاربران، جمع‌آوران، سفارش‌ها، قیمت‌ها و کمیسیون از طریق پنل ادمین جنگو (Django Admin) در آدرس{" "}
              <code dir="ltr">/admin/</code> نیز در دسترس است.
            </p>
          </>
        )}

        {isStaff && tab === "verification" && <VerificationTab />}
        {isStaff && tab === "charts" && <ChartsTab />}
        {isStaff && tab === "tools" && <ToolsTab />}
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
