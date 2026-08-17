import { useState } from "react";
import { useParams } from "react-router-dom";
import { useImpactProject, useMyGreenImpact } from "../api/queries";
import { IMPACT_CATEGORY_LABELS, type ImpactContribution } from "../api/types";
import { Button, Card, CenterLoading, DemoBadge, EmptyState, TopBar } from "../components/ui";
import { formatToman } from "../lib/format";
import ImpactContributeModal from "../components/ImpactContributeModal";
import ImpactSuccessModal from "../components/ImpactSuccessModal";

const SHARE_PREFIX = "من امروز در سبزینو اثر سبز ایجاد کردم 🌱";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-brand-50 text-brand-700",
  PAUSED: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-slate-100 text-slate-600",
};

export default function ImpactProjectDetail() {
  const { uid } = useParams();
  const { data: project, isLoading } = useImpactProject(uid);
  const { data: impact } = useMyGreenImpact();
  const [contributing, setContributing] = useState(false);
  const [successContributions, setSuccessContributions] = useState<ImpactContribution[] | null>(null);

  if (isLoading) return <CenterLoading />;
  if (!project) return <EmptyState icon="🌍" title="این طرح یافت نشد" />;

  const hasGoal = project.goal_amount !== null && project.progress_percent !== null;

  async function handleShare() {
    const text = `${SHARE_PREFIX} — «${project!.title}»`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* user cancelled */
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* clipboard unavailable, ignore */
      }
    }
  }

  return (
    <div>
      <TopBar title="جزئیات طرح" right={project.is_demo ? <DemoBadge /> : undefined} />

      <div className="px-4 flex flex-col gap-4">
        <div className="rounded-3xl p-5 text-white relative overflow-hidden shadow-md" style={{ background: "linear-gradient(120deg, #0b3d24 0%, #14603a 45%, #1c8a4f 100%)" }}>
          <span className="absolute -left-8 -top-10 w-32 h-32 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative z-10 flex items-start gap-3">
            <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl shrink-0">
              {project.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-base leading-snug">{project.title}</p>
              <p className="text-[11px] text-brand-50/90 mt-1">
                {IMPACT_CATEGORY_LABELS[project.category]}
                {project.operator_name ? ` · مجری: ${project.operator_name}` : ""}
                {project.city_name ? ` · ${project.city_name}` : ""}
              </p>
            </div>
            <span className={`text-[10.5px] px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_STYLES[project.status]}`}>
              {project.status_display}
            </span>
          </div>

          <div className="relative z-10 mt-5">
            {hasGoal ? (
              <>
                <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full rounded-full bg-white" style={{ width: `${project.progress_percent}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-brand-50/90 mt-1.5">
                  <span>{formatToman(project.raised_amount)} از {formatToman(project.goal_amount)} تومان</span>
                  <span className="font-bold">{project.progress_percent}٪</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-brand-50/90">
                <span>طرح مستمر — بدون سقف مشخص</span>
                <span className="font-bold">{formatToman(project.raised_amount)} تومان جمع‌آوری‌شده</span>
              </div>
            )}
          </div>
        </div>

        {project.summary && (
          <Card className="p-4">
            <p className="text-xs font-bold text-ink-700 mb-1.5">هدف طرح</p>
            <p className="text-xs text-ink-600 leading-relaxed">{project.summary}</p>
          </Card>
        )}

        {project.description && (
          <Card className="p-4">
            <p className="text-xs font-bold text-ink-700 mb-1.5">دربارهٔ این طرح</p>
            <p className="text-xs text-ink-600 leading-relaxed">{project.description}</p>
          </Card>
        )}

        {(project.progress_report || project.impact_report) && (
          <Card className="p-4">
            <p className="text-xs font-bold text-ink-700 mb-2.5">شفافیت و گزارش‌ها</p>
            <div className="flex flex-col gap-2.5">
              {project.progress_report && (
                <div className="bg-brand-50/60 rounded-xl p-3 flex gap-2.5">
                  <span className="text-base shrink-0">📊</span>
                  <div>
                    <p className="text-[11px] font-medium text-ink-700 mb-0.5">گزارش پیشرفت</p>
                    <p className="text-[11px] text-ink-600 leading-relaxed">{project.progress_report}</p>
                  </div>
                </div>
              )}
              {project.impact_report && (
                <div className="bg-brand-50/60 rounded-xl p-3 flex gap-2.5">
                  <span className="text-base shrink-0">🌍</span>
                  <div>
                    <p className="text-[11px] font-medium text-ink-700 mb-0.5">گزارش اثر ایجادشده</p>
                    <p className="text-[11px] text-ink-600 leading-relaxed">{project.impact_report}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        <p className="text-[10.5px] text-ink-400 leading-relaxed px-1">
          سبزینو ادعای اثبات‌نشده دربارهٔ کمک به افراد یا طرح‌ها نمی‌کند؛ اعداد بالا بر پایه مشارکت‌های واقعی ثبت‌شده در این طرح است
          {project.is_demo ? " و این طرح فعلاً یک طرح نمونه برای نمایش MVP است." : "."}
        </p>

        <div className="flex flex-col gap-2 pb-2">
          <Button full disabled={project.status !== "ACTIVE"} onClick={() => setContributing(true)}>
            {project.status === "ACTIVE" ? "مشارکت در این طرح 🌱" : "این طرح در حال حاضر غیرفعال است"}
          </Button>
          <Button full variant="secondary" onClick={handleShare}>
            اشتراک‌گذاری این طرح
          </Button>
        </div>
      </div>

      {contributing && (
        <ImpactContributeModal
          project={project}
          walletBalance={impact?.wallet_balance || 0}
          onClose={() => setContributing(false)}
          onDone={(contributions) => {
            setContributing(false);
            setSuccessContributions(contributions);
          }}
        />
      )}

      {successContributions && (
        <ImpactSuccessModal open contributions={successContributions} onClose={() => setSuccessContributions(null)} />
      )}
    </div>
  );
}
