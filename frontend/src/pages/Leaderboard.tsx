import { useLeaderboard } from "../api/queries";
import { Card, CenterLoading, DemoBadge, TopBar } from "../components/ui";
import { formatNumber } from "../lib/format";

export default function Leaderboard() {
  const { data, isLoading } = useLeaderboard();

  return (
    <div>
      <TopBar title="رتبه‌بندی شهروندان" right={<DemoBadge />} />
      <div className="px-4">
        {isLoading ? (
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
        )}
      </div>
    </div>
  );
}
