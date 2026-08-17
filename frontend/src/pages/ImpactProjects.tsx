import { useState } from "react";
import { Link } from "react-router-dom";
import { useImpactProjects, useMyGreenImpact } from "../api/queries";
import {
  IMPACT_CATEGORY_ICONS, IMPACT_CATEGORY_LABELS, type ImpactCategory, type ImpactContribution, type ImpactProject,
} from "../api/types";
import { Button, Card, CenterLoading, DemoBadge, EmptyState, TopBar } from "../components/ui";
import { formatToman } from "../lib/format";
import ImpactSuccessModal from "../components/ImpactSuccessModal";
import ImpactContributeModal from "../components/ImpactContributeModal";

const CATEGORY_FILTERS: { key: ImpactCategory | "ALL"; label: string; icon: string }[] = [
  { key: "ALL", label: "همه", icon: "🌐" },
  { key: "ENVIRONMENT", label: IMPACT_CATEGORY_LABELS.ENVIRONMENT, icon: IMPACT_CATEGORY_ICONS.ENVIRONMENT },
  { key: "SOCIAL", label: IMPACT_CATEGORY_LABELS.SOCIAL, icon: IMPACT_CATEGORY_ICONS.SOCIAL },
  { key: "EMPLOYMENT", label: IMPACT_CATEGORY_LABELS.EMPLOYMENT, icon: IMPACT_CATEGORY_ICONS.EMPLOYMENT },
  { key: "LOCAL", label: IMPACT_CATEGORY_LABELS.LOCAL, icon: IMPACT_CATEGORY_ICONS.LOCAL },
];

const STATUS_STYLES: Record<ImpactProject["status"], string> = {
  ACTIVE: "bg-brand-50 text-brand-700",
  PAUSED: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-slate-100 text-slate-600",
};

function ProjectCard({ project, onContribute }: { project: ImpactProject; onContribute: (p: ImpactProject) => void }) {
  const hasGoal = project.goal_amount !== null && project.progress_percent !== null;
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center text-xl shrink-0">
          {project.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to={`/green-impact/projects/${project.uid}`} className="text-sm font-bold text-ink-900">
              {project.title}
            </Link>
            {project.is_demo && <DemoBadge />}
          </div>
          <p className="text-[11px] text-ink-500 mt-0.5">{IMPACT_CATEGORY_LABELS[project.category]}{project.operator_name ? ` · ${project.operator_name}` : ""}</p>
        </div>
        <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[project.status]}`}>
          {project.status_display}
        </span>
      </div>

      {project.summary && <p className="text-xs text-ink-600 leading-relaxed">{project.summary}</p>}

      {hasGoal ? (
        <div className="flex flex-col gap-1">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${project.progress_percent}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-ink-500">
            <span>{formatToman(project.raised_amount)} از {formatToman(project.goal_amount)} تومان</span>
            <span>{project.progress_percent}٪</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] text-ink-500">
          <span>طرح مستمر — بدون سقف مشخص</span>
          <span className="font-medium text-brand-600">{formatToman(project.raised_amount)} تومان جمع‌آوری‌شده</span>
        </div>
      )}

      {(project.description || project.progress_report || project.impact_report) && (
        <div>
          <button type="button" className="text-[11px] text-brand-600 font-medium" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "بستن جزئیات ‹" : "جزئیات و گزارش پیشرفت ›"}
          </button>
          {expanded && (
            <div className="mt-2 flex flex-col gap-2">
              {project.description && <p className="text-[11px] text-ink-600 leading-relaxed">{project.description}</p>}
              {project.progress_report && (
                <p className="text-[11px] text-ink-500 leading-relaxed bg-brand-50/60 rounded-xl p-2.5">
                  <span className="font-medium text-ink-700">گزارش پیشرفت: </span>{project.progress_report}
                </p>
              )}
              {project.impact_report && (
                <p className="text-[11px] text-ink-500 leading-relaxed bg-brand-50/60 rounded-xl p-2.5">
                  <span className="font-medium text-ink-700">گزارش اثر: </span>{project.impact_report}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <Button
        full
        variant="secondary"
        disabled={project.status !== "ACTIVE"}
        onClick={() => onContribute(project)}
      >
        {project.status === "ACTIVE" ? "مشارکت 🌱" : "غیرفعال"}
      </Button>
    </Card>
  );
}

export default function ImpactProjects() {
  const [category, setCategory] = useState<ImpactCategory | "ALL">("ALL");
  const { data: projects, isLoading } = useImpactProjects(category === "ALL" ? undefined : { category });
  const { data: impact } = useMyGreenImpact();
  const [contributeTarget, setContributeTarget] = useState<ImpactProject | null>(null);
  const [successContributions, setSuccessContributions] = useState<ImpactContribution[] | null>(null);

  return (
    <div>
      <TopBar title="پروژه‌های اثر سبز" subtitle="زباله من، آینده یک نفر" right={<DemoBadge />} />

      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setCategory(f.key)}
              className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full transition ${
                category === f.key ? "bg-brand-500 text-white" : "bg-white text-ink-600 shadow-sm"
              }`}
            >
              <span>{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {isLoading ? (
          <CenterLoading />
        ) : !projects || projects.length === 0 ? (
          <EmptyState icon="🌍" title="طرحی در این دسته وجود ندارد" subtitle="بعداً دوباره سر بزنید" />
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((p) => (
              <ProjectCard key={p.uid} project={p} onContribute={setContributeTarget} />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-4 pb-2">
        <p className="text-[11px] text-ink-400 leading-relaxed">
          سبزینو ادعای اثبات‌نشده دربارهٔ کمک به افراد یا طرح‌ها نمی‌کند؛ همهٔ اعداد این صفحه بر پایه مشارکت‌های واقعی ثبت‌شده است.
        </p>
      </div>

      {contributeTarget && (
        <ImpactContributeModal
          project={contributeTarget}
          walletBalance={impact?.wallet_balance || 0}
          onClose={() => setContributeTarget(null)}
          onDone={(contributions) => {
            setContributeTarget(null);
            setSuccessContributions(contributions);
          }}
        />
      )}

      {successContributions && (
        <ImpactSuccessModal
          open
          contributions={successContributions}
          onClose={() => setSuccessContributions(null)}
        />
      )}
    </div>
  );
}
