import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useGreenPoints, useMyContributions, useMyGreenImpact, useMyImpact, useMyRequests, useQRCode,
} from "../api/queries";
import { useAuthStore } from "../store/auth";
import { IMPACT_CATEGORY_ICONS, IMPACT_CATEGORY_LABELS, type ImpactCategory, type ImpactContribution } from "../api/types";
import { Button, Card, CenterLoading, DemoBadge, EmptyState, TopBar } from "../components/ui";
import { formatKg, formatNumber, formatToman, toJalali } from "../lib/format";

const CATEGORY_ORDER: ImpactCategory[] = ["ENVIRONMENT", "SOCIAL", "EMPLOYMENT", "LOCAL"];
const CATEGORY_BAR_COLORS: Record<ImpactCategory, string> = {
  ENVIRONMENT: "bg-brand-500",
  SOCIAL: "bg-rose-400",
  EMPLOYMENT: "bg-amber-400",
  LOCAL: "bg-sky-400",
};

function ReceiptModal({ contribution, onClose }: { contribution: ImpactContribution; onClose: () => void }) {
  const { data: qr, isLoading } = useQRCode(contribution.tracking_code);

  function handleDownload() {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `sabzino-green-impact-${contribution.tracking_code}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 relative animate-impact-sheet max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <span className="text-base">🌱</span>
          <p className="text-sm font-extrabold text-ink-900">رسید دیجیتال مشارکت</p>
        </div>
        <p className="text-[11px] text-ink-500 text-center mb-4">اثر سبز من — سبزینو</p>

        <div className="flex flex-col items-center text-center">
          {isLoading ? (
            <CenterLoading />
          ) : qr ? (
            <img src={qr} alt="QR رسید" className="w-32 h-32 rounded-xl border border-brand-100" />
          ) : null}
          <p className="text-[11px] text-ink-500 mt-2">کد پیگیری: {contribution.tracking_code}</p>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 text-sm">
          <Row label="طرح" value={`${contribution.project_icon} ${contribution.project_title}`} />
          <Row label="دسته‌بندی" value={IMPACT_CATEGORY_LABELS[contribution.project_category]} />
          <Row label="مبلغ مشارکت" value={`${formatToman(contribution.amount)} تومان`} />
          {contribution.waste_value_snapshot && (
            <Row label="ارزش کل تحویل" value={`${formatToman(contribution.waste_value_snapshot)} تومان`} />
          )}
          {contribution.request_code && <Row label="کد درخواست" value={contribution.request_code} />}
          <Row label="تاریخ" value={toJalali(contribution.created_at)} />
        </div>

        <div className="flex flex-col gap-2 mt-5">
          <Button full variant="secondary" onClick={handleDownload} disabled={!qr}>
            دانلود فایل رسید (QR)
          </Button>
          <Button full onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-brand-50 pb-2">
      <span className="text-ink-500 text-xs">{label}</span>
      <span className="text-ink-900 font-medium text-xs">{value}</span>
    </div>
  );
}

export default function GreenImpact() {
  const user = useAuthStore((s) => s.user);
  const { data: impact, isLoading: impactLoading } = useMyGreenImpact();
  const { data: myImpact } = useMyImpact();
  const { data: points } = useGreenPoints();
  const { data: requests } = useMyRequests();
  const { data: contributions, isLoading: contributionsLoading } = useMyContributions();
  const [receipt, setReceipt] = useState<ImpactContribution | null>(null);

  const economicValue = (requests || []).reduce(
    (sum, r) => sum + (r.weighing ? Number(r.weighing.total_value) : 0),
    0,
  );

  const tierPct = impact
    ? impact.tier.next_threshold
      ? Math.min(100, Math.round((impact.tier.deliveries / impact.tier.next_threshold) * 100))
      : 100
    : 0;

  return (
    <div>
      <TopBar title="اثر سبز من" subtitle="هر تحویل، یک اثر" right={<DemoBadge />} />

      {user && (
        <div className="px-4 mb-1 flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-base font-bold shrink-0">
            {user.first_name?.[0] || "س"}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-900 truncate">
              {user.first_name || user.last_name ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "کاربر سبزینو"}
            </p>
            <p className="text-[11px] text-ink-500">پروفایل اثر سبز شما</p>
          </div>
        </div>
      )}

      {impactLoading ? (
        <CenterLoading />
      ) : !impact ? (
        <EmptyState icon="🌱" title="اطلاعاتی برای نمایش نیست" />
      ) : (
        <div className="px-4 flex flex-col gap-4">
          {/* Tier / ladder card */}
          <div className="rounded-3xl p-5 text-white relative overflow-hidden shadow-md" style={{ background: "linear-gradient(120deg, #0b3d24 0%, #14603a 45%, #1c8a4f 100%)" }}>
            <span className="absolute -left-8 -top-10 w-32 h-32 rounded-full bg-white/10" aria-hidden="true" />
            <div className="relative z-10 flex items-center gap-3">
              <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl">
                {impact.tier.icon}
              </span>
              <div>
                <p className="font-extrabold text-base">{impact.tier.name}</p>
                <p className="text-[11px] text-brand-50/90 mt-0.5">
                  {formatNumber(impact.tier.deliveries)} تحویل ثبت‌شده
                </p>
              </div>
            </div>
            {impact.tier.next_name && impact.tier.next_threshold && (
              <div className="relative z-10 mt-4">
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full rounded-full bg-white" style={{ width: `${tierPct}%` }} />
                </div>
                <p className="text-[10.5px] text-brand-50/90 mt-1.5">
                  {formatNumber(impact.tier.next_threshold - impact.tier.deliveries)} تحویل دیگر تا «{impact.tier.next_name}»
                </p>
              </div>
            )}
            <p className="relative z-10 text-[11px] text-brand-50/80 mt-3 leading-relaxed">
              زباله من، آینده یک نفر 🌍
            </p>
          </div>

          {/* Stat grid: kg / economic value / social contribution / points */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <span className="w-9 h-9 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center text-base mb-2">♻️</span>
              <p className="text-lg font-extrabold text-ink-900">{formatKg(myImpact?.total_kg_recycled || 0)}</p>
              <p className="text-[10.5px] text-ink-500 mt-0.5">کیلوگرم تحویل‌داده‌شده</p>
            </Card>
            <Card className="p-4">
              <span className="w-9 h-9 rounded-full bg-violet-50 text-violet-700 flex items-center justify-center text-base mb-2">💰</span>
              <p className="text-lg font-extrabold text-ink-900">{formatToman(economicValue)}</p>
              <p className="text-[10.5px] text-ink-500 mt-0.5">ارزش اقتصادی ایجادشده (تومان)</p>
            </Card>
            <Card className="p-4">
              <span className="w-9 h-9 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center text-base mb-2">❤️</span>
              <p className="text-lg font-extrabold text-ink-900">{formatToman(impact.total_contributed)}</p>
              <p className="text-[10.5px] text-ink-500 mt-0.5">مشارکت اثر سبز (تومان)</p>
            </Card>
            <Card className="p-4">
              <span className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-base mb-2">🌿</span>
              <p className="text-lg font-extrabold text-ink-900">{points ? formatNumber(points.points) : "—"}</p>
              <p className="text-[10.5px] text-ink-500 mt-0.5">امتیاز سبزینو</p>
            </Card>
          </div>

          {/* Category breakdown */}
          {impact.contributions_count > 0 && (
            <Card className="p-4">
              <p className="text-xs font-bold text-ink-700 mb-3">اثر من به تفکیک حوزه</p>
              <div className="flex flex-col gap-2.5">
                {CATEGORY_ORDER.map((cat) => {
                  const value = impact.category_totals[cat] || 0;
                  const pct = impact.total_contributed > 0 ? Math.round((value / impact.total_contributed) * 100) : 0;
                  if (value <= 0) return null;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-ink-700 font-medium">{IMPACT_CATEGORY_ICONS[cat]} {IMPACT_CATEGORY_LABELS[cat]}</span>
                        <span className="text-ink-500">{formatToman(value)} تومان</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${CATEGORY_BAR_COLORS[cat]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Link
            to="/green-impact/projects"
            className="rounded-2xl bg-brand-500 text-white text-sm font-medium py-3.5 text-center shadow-sm active:scale-[0.98] transition"
          >
            مشاهده پروژه‌های اثر سبز 🌍
          </Link>

          {/* Contribution history / receipts */}
          <div>
            <p className="text-xs font-bold text-ink-700 mb-3">تاریخچه مشارکت‌ها</p>
            {contributionsLoading ? (
              <CenterLoading />
            ) : !contributions || contributions.length === 0 ? (
              <Card className="p-6 text-center text-xs text-ink-500">
                هنوز مشارکتی ثبت نکرده‌اید. از صفحه «پروژه‌های اثر سبز» می‌توانید شروع کنید.
              </Card>
            ) : (
              <div className="flex flex-col gap-2.5">
                {contributions.map((c) => (
                  <button key={c.uid} type="button" onClick={() => setReceipt(c)} className="text-right">
                    <Card className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-base shrink-0">
                          {c.project_icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink-900 truncate">{c.project_title}</p>
                          <p className="text-[10.5px] text-ink-500 mt-0.5">{toJalali(c.created_at)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-extrabold text-brand-600 shrink-0">{formatToman(c.amount)} ت</span>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-ink-400 leading-relaxed pb-2">{impact.note}</p>
        </div>
      )}

      {receipt && <ReceiptModal contribution={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
