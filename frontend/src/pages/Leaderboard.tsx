import { useState } from "react";
import { useLeaderboard, useNeighborhoodLeaderboard } from "../api/queries";
import { Card, CenterLoading, DemoBadge, EmptyState, TopBar } from "../components/ui";
import { formatKg, formatNumber } from "../lib/format";

type Tab = "individual" | "neighborhood";

export default function Leaderboard() {
  const [tab, setTab] = useState<Tab>("individual");
  const { data, isLoading } = useLeaderboard();
  const { data: neighborhoodData, isLoading: neighborhoodLoading } = useNeighborhoodLeaderboard();

  return (
    <div>
      <TopBar title="رتبه‌بندی شهروندان" right={<DemoBadge />} />

      <div className="px-4 mb-3 -mx-1 overflow-x-auto">
        <div className="flex gap-2 px-1 w-max">
          {([
            ["individual", "شهروندان"],
            ["neighborhood", "محله‌ها"],
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

      <div className="px-4">
        {tab === "individual" ? (
          isLoading ? (
            <CenterLoading />
          ) : (
            <div className="flex flex-col gap-2">
              {(data || []).map((row: { rank: number; name: string; points: number; level: number }) => (
                <Card key={row.rank} className="p-3.5 flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${row.rank <= 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-ink-600"}`}>
                    {row.rank}
                  </span>
                  <span className="flex-1 text-sm font-medium">{row.name}</span>
                  <span className="text-xs text-ink-500">سطح {row.level}</span>
                  <span className="text-sm font-bold text-brand-600">{formatNumber(row.points)} 🌿</span>
                </Card>
              ))}
            </div>
          )
        ) : neighborhoodLoading ? (
          <CenterLoading />
        ) : !neighborhoodData?.length ? (
          <EmptyState icon="🏘️" title="هنوز رتبه‌بندی محله‌ای ثبت نشده" />
        ) : (
          <div className="flex flex-col gap-2">
            {neighborhoodData.map((row) => (
              <Card key={row.rank} className="p-3.5 flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${row.rank <= 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-ink-600"}`}>
                  {row.rank}
                </span>
                <span className="flex-1 text-sm font-medium">{row.neighborhood}</span>
                <span className="text-xs text-ink-500">{formatNumber(row.active_users)} کاربر فعال</span>
                <span className="text-sm font-bold text-brand-600">{formatKg(row.total_weight_kg)} کیلوگرم</span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
