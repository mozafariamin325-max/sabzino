import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import { Card, CenterLoading, DemoBadge, TopBar } from "../components/ui";
import { formatKg, formatNumber, formatToman } from "../lib/format";

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.is_staff;

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
      <div className="px-4">
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((k) => (
            <Card key={k.label} className="p-4">
              <p className="text-lg font-extrabold text-brand-600">{k.value}</p>
              <p className="text-[11px] text-ink-500 mt-1">{k.label}</p>
            </Card>
          ))}
        </div>
        <p className="text-[11px] text-ink-400 mt-4 leading-5">
          این نسخه اول داشبورد مدیریت است. مدیریت کامل کاربران، جمع‌آوران، سفارش‌ها، قیمت‌ها و کمیسیون از طریق پنل ادمین جنگو
          (Django Admin) در آدرس <code dir="ltr">/admin/</code> در دسترس است و به همین بک‌اند واقعی متصل است.
        </p>
      </div>
    </div>
  );
}
