import { useChallenges } from "../api/queries";
import type { Challenge } from "../api/types";
import { Card, CenterLoading, DemoBadge, EmptyState, TopBar } from "../components/ui";
import { formatNumber } from "../lib/format";

const TYPE_ICONS: Record<Challenge["type"], string> = {
  WEIGHT: "⚖️",
  TRANSACTIONS: "🔄",
  STREAK: "🔥",
  REFERRAL: "🤝",
  NEIGHBORHOOD: "🏘️",
};

const TYPE_LABELS: Record<Challenge["type"], string> = {
  WEIGHT: "وزن پسماند",
  TRANSACTIONS: "تعداد تحویل",
  STREAK: "پیوستگی",
  REFERRAL: "دعوت دوستان",
  NEIGHBORHOOD: "محله",
};

const TYPE_STYLES: Record<Challenge["type"], { bg: string; text: string; bar: string }> = {
  WEIGHT: { bg: "bg-sky-50", text: "text-sky-700", bar: "bg-sky-500" },
  TRANSACTIONS: { bg: "bg-violet-50", text: "text-violet-700", bar: "bg-violet-500" },
  STREAK: { bg: "bg-orange-50", text: "text-orange-700", bar: "bg-orange-500" },
  REFERRAL: { bg: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-500" },
  NEIGHBORHOOD: { bg: "bg-teal-50", text: "text-teal-700", bar: "bg-teal-500" },
};

function progressPercent(challenge: Challenge): number {
  const target = Number(challenge.target_value);
  if (!challenge.my_progress || !target) return 0;
  const pct = (challenge.my_progress.progress_value / target) * 100;
  return Math.min(100, Math.max(0, pct));
}

function daysLeft(endAt: string): number | null {
  const diff = new Date(endAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const pct = progressPercent(challenge);
  const completed = !!challenge.my_progress?.completed;
  const started = (challenge.my_progress?.progress_value || 0) > 0;
  const style = TYPE_STYLES[challenge.type];
  const left = challenge.end_at ? daysLeft(challenge.end_at) : null;

  return (
    <Card className={`p-4 flex flex-col gap-3 relative overflow-hidden ${completed ? "ring-1 ring-brand-200" : ""}`}>
      {completed && (
        <span className="absolute -left-9 top-3 rotate-45 bg-brand-500 text-white text-[10px] font-bold px-10 py-0.5 shadow-sm">
          تکمیل
        </span>
      )}
      <div className="flex items-start gap-3">
        <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${style.bg} ${style.text}`}>
          {TYPE_ICONS[challenge.type]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-ink-900 truncate">{challenge.title}</h3>
          </div>
          <p className={`text-[10.5px] mt-0.5 font-medium ${style.text}`}>{TYPE_LABELS[challenge.type]}</p>
          {challenge.description && (
            <p className="text-xs text-ink-500 mt-1 leading-5">{challenge.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold">
          🌿 {formatNumber(challenge.reward_points)} امتیاز
        </span>
        {completed ? (
          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-brand-500 text-white font-medium">
            تکمیل شد ✅
          </span>
        ) : left !== null ? (
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${left <= 2 ? "bg-red-50 text-red-600" : "bg-slate-100 text-ink-500"}`}>
            {left > 0 ? `${formatNumber(left)} روز مانده` : "امروز پایان می‌یابد"}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${completed ? "bg-brand-600" : style.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-500">
          <span>
            {started
              ? `${formatNumber(challenge.my_progress!.progress_value)} از ${formatNumber(challenge.target_value)}`
              : "هنوز شروع نکرده‌اید"}
          </span>
          <span className="font-bold text-ink-700">{formatNumber(Math.round(pct))}٪</span>
        </div>
      </div>
    </Card>
  );
}

function SectionHeader({ icon, title, count }: { icon: string; title: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className="text-sm">{icon}</span>
      <p className="text-xs font-bold text-ink-700">{title}</p>
      <span className="text-[10.5px] text-ink-400">({formatNumber(count)})</span>
    </div>
  );
}

export default function Missions() {
  const { data, isLoading } = useChallenges();
  const activeChallenges = (data || []).filter((c) => c.is_active);

  // Note: the API always returns a synthesized {progress_value: 0, completed: false}
  // object even when the citizen has no participation row yet, so "not started" is
  // determined by a zero progress value rather than my_progress being null/absent.
  const completed = activeChallenges.filter((c) => c.my_progress?.completed);
  const inProgress = activeChallenges.filter((c) => !c.my_progress?.completed && (c.my_progress?.progress_value || 0) > 0);
  const notStarted = activeChallenges.filter((c) => !c.my_progress?.completed && !(c.my_progress?.progress_value || 0));

  const totalPointsAvailable = activeChallenges.reduce((sum, c) => sum + c.reward_points, 0);
  const earnedPoints = completed.reduce((sum, c) => sum + c.reward_points, 0);

  return (
    <div>
      <TopBar title="ماموریت‌های سبز" subtitle="با هر تحویل، یک قدم به جایزه بعدی نزدیک‌تر شو" right={<DemoBadge />} />

      <div className="px-4">
        {!isLoading && activeChallenges.length > 0 && (
          <div
            className="rounded-3xl p-5 text-white relative overflow-hidden shadow-md mb-4"
            style={{ background: "linear-gradient(120deg, #0b3d24 0%, #14603a 45%, #1c8a4f 100%)" }}
          >
            <span className="absolute -left-8 -top-10 w-32 h-32 rounded-full bg-white/10" aria-hidden="true" />
            <span className="absolute left-20 -bottom-12 w-24 h-24 rounded-full bg-white/10" aria-hidden="true" />
            <div className="relative z-10 flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl shrink-0">🎯</span>
              <div>
                <p className="font-extrabold text-base">{formatNumber(completed.length)} از {formatNumber(activeChallenges.length)} ماموریت تکمیل‌شده</p>
                <p className="text-[11px] text-brand-50/90 mt-0.5">
                  {formatNumber(earnedPoints)} از {formatNumber(totalPointsAvailable)} امتیاز کسب‌شده
                </p>
              </div>
            </div>
            <div className="relative z-10 mt-4">
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${totalPointsAvailable ? Math.round((earnedPoints / totalPointsAvailable) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <CenterLoading />
        ) : activeChallenges.length === 0 ? (
          <EmptyState icon="🎯" title="در حال حاضر ماموریت فعالی وجود ندارد" subtitle="به‌زودی ماموریت‌های جدید اضافه می‌شود" />
        ) : (
          <div className="flex flex-col gap-3 pb-6">
            {inProgress.length > 0 && (
              <>
                <SectionHeader icon="⏳" title="در حال انجام" count={inProgress.length} />
                {inProgress.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </>
            )}
            {notStarted.length > 0 && (
              <>
                <SectionHeader icon="🆕" title="شروع‌نشده" count={notStarted.length} />
                {notStarted.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </>
            )}
            {completed.length > 0 && (
              <>
                <SectionHeader icon="✅" title="تکمیل‌شده" count={completed.length} />
                {completed.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
