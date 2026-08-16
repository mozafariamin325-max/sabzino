import { useChallenges } from "../api/queries";
import type { Challenge } from "../api/types";
import { Card, CenterLoading, DemoBadge, EmptyState, TopBar } from "../components/ui";
import { formatNumber, toJalali } from "../lib/format";

const TYPE_ICONS: Record<Challenge["type"], string> = {
  WEIGHT: "⚖️",
  TRANSACTIONS: "🔄",
  STREAK: "🔥",
  REFERRAL: "🤝",
  NEIGHBORHOOD: "🏘️",
};

function progressPercent(challenge: Challenge): number {
  const target = Number(challenge.target_value);
  if (!challenge.my_progress || !target) return 0;
  const pct = (challenge.my_progress.progress_value / target) * 100;
  return Math.min(100, Math.max(0, pct));
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const pct = progressPercent(challenge);
  const completed = !!challenge.my_progress?.completed;
  const started = !!challenge.my_progress;

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-xl shrink-0">
          {TYPE_ICONS[challenge.type]}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-ink-900">{challenge.title}</h3>
          {challenge.description && (
            <p className="text-xs text-ink-500 mt-0.5">{challenge.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
          🌿 {formatNumber(challenge.reward_points)} امتیاز
        </span>
        {completed && (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">
            تکمیل شد ✅
          </span>
        )}
        {challenge.end_at && (
          <span className="text-[11px] text-ink-500">تا {toJalali(challenge.end_at)}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${completed ? "bg-brand-600" : "bg-brand-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-500">
          <span>
            {started
              ? `${formatNumber(challenge.my_progress!.progress_value)} از ${formatNumber(challenge.target_value)}`
              : "شروع نشده"}
          </span>
          <span>{formatNumber(Math.round(pct))}٪</span>
        </div>
      </div>
    </Card>
  );
}

export default function Missions() {
  const { data, isLoading } = useChallenges();
  const activeChallenges = (data || []).filter((c) => c.is_active);

  return (
    <div>
      <TopBar title="ماموریت‌های سبز" right={<DemoBadge />} />
      <div className="px-4">
        {isLoading ? (
          <CenterLoading />
        ) : activeChallenges.length === 0 ? (
          <EmptyState icon="🎯" title="در حال حاضر ماموریت فعالی وجود ندارد" subtitle="به‌زودی ماموریت‌های جدید اضافه می‌شود" />
        ) : (
          <div className="flex flex-col gap-3">
            {activeChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
