import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useCancelRequest, useContribute, useCreateRating, useImpactProjects, useMyContributions,
  useMyGivenRatings, useQRCode, useRequestDetail,
} from "../api/queries";
import { Button, Card, CenterLoading, StatusPill, TopBar } from "../components/ui";
import { IMPACT_CATEGORY_LABELS, STATUS_LABELS } from "../api/types";
import { formatKg, formatToman, toJalaliTime } from "../lib/format";
import ImpactSuccessModal from "../components/ImpactSuccessModal";

const FLOW = ["REQUESTED", "SEARCHING_COLLECTOR", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "COLLECTED", "COMPLETED"];

export default function RequestDetail() {
  const { uid } = useParams();
  const { data: req, isLoading } = useRequestDetail(uid);
  const cancelRequest = useCancelRequest();

  if (isLoading || !req) return <CenterLoading />;

  const currentIndex = FLOW.indexOf(req.status);
  const canCancel = !["COMPLETED", "CANCELLED"].includes(req.status);

  return (
    <div>
      <TopBar title={`درخواست #${req.code}`} right={<StatusPill status={req.status} label={STATUS_LABELS[req.status] || req.status_display} />} />

      <div className="px-4 flex flex-col gap-3">
        {req.status !== "CANCELLED" && (
          <Card className="p-4">
            <p className="text-xs font-bold text-ink-700 mb-3">وضعیت پیگیری</p>
            <div className="flex flex-col gap-3">
              {FLOW.map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      i <= currentIndex ? "bg-brand-500" : "bg-brand-100"
                    }`}
                  />
                  <p className={`text-xs ${i <= currentIndex ? "text-ink-900 font-medium" : "text-ink-400"}`}>
                    {STATUS_LABELS[s]}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {req.assignment && (
          <Card className="p-4">
            <p className="text-xs font-bold text-ink-700 mb-2">جمع‌آور</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{req.assignment.collector_name || "در حال تخصیص"}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">امتیاز: {req.assignment.collector_rating} ⭐</p>
              </div>
              {req.assignment.collector_phone && (
                <a href={`tel:${req.assignment.collector_phone}`} className="text-brand-600 text-xs font-medium">
                  📞 تماس
                </a>
              )}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <p className="text-xs font-bold text-ink-700 mb-2">جزئیات درخواست</p>
          <p className="text-xs text-ink-500">مواد</p>
          <p className="text-sm mb-2">{req.materials.map((m) => m.name).join("، ")}</p>
          <p className="text-xs text-ink-500">مقدار تقریبی</p>
          <p className="text-sm mb-2">{req.amount_range_display}</p>
          <p className="text-xs text-ink-500">آدرس</p>
          <p className="text-sm mb-2">{req.address_text_snapshot}</p>
          {req.description && (
            <>
              <p className="text-xs text-ink-500">توضیحات</p>
              <p className="text-sm mb-2">{req.description}</p>
            </>
          )}
          <p className="text-xs text-ink-500">تاریخ ثبت</p>
          <p className="text-sm">{toJalaliTime(req.created_at)}</p>
        </Card>

        {req.status === "COMPLETED" && <DigitalReceipt code={req.code} uid={req.uid} />}

        {req.status === "COMPLETED" && req.assignment && (
          <CollectorRating requestUid={req.uid} collectorId={req.assignment.collector} collectorName={req.assignment.collector_name} />
        )}

        {req.weighing ? (
          <Card className="p-4 bg-brand-50 border border-brand-100">
            <p className="text-xs font-bold text-brand-700 mb-2">رسید نهایی وزن‌کشی</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-ink-500 text-xs">وزن نهایی</p>
                <p className="font-bold">{formatKg(req.weighing.weight_kg)} کیلو</p>
              </div>
              <div>
                <p className="text-ink-500 text-xs">مبلغ واریزی</p>
                <p className="font-bold text-brand-700">{formatToman(req.weighing.total_value)} تومان</p>
              </div>
              <div>
                <p className="text-ink-500 text-xs">امتیاز دریافتی</p>
                <p className="font-bold">{req.weighing.points_awarded} 🌿</p>
              </div>
              <div>
                <p className="text-ink-500 text-xs">قیمت واحد</p>
                <p className="font-bold">{formatToman(req.weighing.unit_price_snapshot)} ت</p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <p className="text-xs text-ink-500">ارزش تخمینی</p>
            <p className="font-bold text-brand-600">{formatToman(req.estimated_value)} تومان</p>
          </Card>
        )}

        {req.status === "COMPLETED" && req.weighing && (
          <GreenImpactChoice requestUid={req.uid} totalValue={Number(req.weighing.total_value)} />
        )}

        {canCancel && (
          <Button
            variant="danger"
            loading={cancelRequest.isPending}
            onClick={() => uid && cancelRequest.mutate(uid)}
          >
            لغو درخواست
          </Button>
        )}
      </div>
    </div>
  );
}

function DigitalReceipt({ code, uid }: { code: string; uid: string }) {
  const { data: qr, isLoading } = useQRCode(uid);
  return (
    <Card className="p-4 flex flex-col items-center text-center">
      <p className="text-xs font-bold text-ink-700 mb-2">رسید دیجیتال</p>
      {isLoading ? (
        <CenterLoading />
      ) : qr ? (
        <img src={qr} alt="QR رسید" className="w-32 h-32 rounded-lg border border-brand-100" />
      ) : null}
      <p className="text-[11px] text-ink-500 mt-2">کد پیگیری: {code}</p>
    </Card>
  );
}

function CollectorRating({
  requestUid, collectorId, collectorName,
}: {
  requestUid: string;
  collectorId: number;
  collectorName: string;
}) {
  const { data: given } = useMyGivenRatings();
  const createRating = useCreateRating();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");

  const existing = (given || []).find((r) => r.reference === requestUid && r.context_type === "COLLECTION");

  if (existing) {
    return (
      <Card className="p-4">
        <p className="text-xs font-bold text-ink-700 mb-1">امتیاز شما به جمع‌آور</p>
        <p className="text-sm">{"⭐".repeat(existing.score)} <span className="text-ink-400">({existing.score} از ۵)</span></p>
        {existing.comment && <p className="text-xs text-ink-500 mt-1">{existing.comment}</p>}
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <p className="text-xs font-bold text-ink-700 mb-2">به {collectorName || "جمع‌آور"} امتیاز بدهید</p>
      <div className="flex gap-1 mb-2 justify-center" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setScore(n)} className="text-2xl leading-none">
            {n <= score ? "⭐" : "☆"}
          </button>
        ))}
      </div>
      <textarea
        className="w-full rounded-xl border border-brand-100 px-3 py-2.5 text-sm mb-2"
        placeholder="نظر شما (اختیاری)"
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {createRating.error && <p className="text-red-600 text-xs mb-2">{(createRating.error as Error).message}</p>}
      <Button
        full
        loading={createRating.isPending}
        onClick={() =>
          createRating.mutate({
            to_user: collectorId,
            context_type: "COLLECTION",
            reference: requestUid,
            score,
            comment,
          })
        }
      >
        ثبت امتیاز
      </Button>
    </Card>
  );
}

type Allocation = { project: string; amount: string };

/**
 * "صفحه انتخاب اثر" from the product flow — appears once a delivery's value
 * is known (weighing complete). Fully optional: doing nothing means the
 * citizen simply keeps the full amount already credited to their wallet by
 * complete_weighing(). Choosing to contribute debits that same wallet via
 * useContribute() (POST /green-impact/contribute/) — no parallel ledger.
 */
function GreenImpactChoice({ requestUid, totalValue }: { requestUid: string; totalValue: number }) {
  const { data: existing, isLoading: existingLoading } = useMyContributions({ request: requestUid });
  const { data: projects } = useImpactProjects({ status: "ACTIVE" });
  const contribute = useContribute();

  const [open, setOpen] = useState(false);
  const [allocations, setAllocations] = useState<Allocation[]>([{ project: "", amount: "" }]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastContributions, setLastContributions] = useState<NonNullable<typeof existing>>([]);

  if (existingLoading) return null;

  if (existing && existing.length > 0) {
    const total = existing.reduce((sum, c) => sum + Number(c.amount), 0);
    return (
      <Card className="p-4 bg-brand-50/60 border border-brand-100">
        <p className="text-xs font-bold text-brand-700 mb-2">🌱 اثر سبز این تحویل</p>
        {existing.map((c) => (
          <p key={c.uid} className="text-[11px] text-ink-600">
            {formatToman(c.amount)} تومان → «{c.project_title}» ({IMPACT_CATEGORY_LABELS[c.project_category]})
          </p>
        ))}
        <p className="text-[11px] text-ink-500 mt-1.5">
          {formatToman(totalValue - total)} تومان از این تحویل نزد شما باقی ماند.
        </p>
      </Card>
    );
  }

  const allocatedTotal = allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const remaining = totalValue - allocatedTotal;
  const canSubmit =
    allocations.every((a) => a.project && Number(a.amount) > 0) && allocatedTotal > 0 && allocatedTotal <= totalValue;

  function updateAllocation(index: number, patch: Partial<Allocation>) {
    setAllocations((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  async function handleSubmit() {
    const res = await contribute.mutateAsync({
      request: requestUid,
      allocations: allocations
        .filter((a) => a.project && Number(a.amount) > 0)
        .map((a) => ({ project: a.project, amount: Number(a.amount) })),
    });
    // stash for the modal — react-query cache already invalidated onSuccess
    setLastContributions(res.contributions);
    setShowSuccess(true);
    setOpen(false);
  }

  if (!open) {
    return (
      <>
        <Card className="p-4 relative overflow-hidden">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-lg flex-shrink-0">🌱</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink-900">هر تحویل، یک اثر</p>
              <p className="text-[11px] text-ink-500 mt-0.5 leading-relaxed">
                می‌خوای بخشی از ارزش این تحویل رو به یک طرح اجتماعی یا محیط‌زیستی اختصاص بدی؟ کاملاً اختیاریه — پول شما همین الان در کیف پولتان است.
              </p>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-xs font-medium text-brand-600 mt-2.5"
              >
                اختصاص به اثر سبز ‹
              </button>
            </div>
          </div>
        </Card>
        {showSuccess && (
          <ImpactSuccessModal open={showSuccess} onClose={() => setShowSuccess(false)} contributions={lastContributions} />
        )}
      </>
    );
  }

  return (
    <Card className="p-4">
      <p className="text-sm font-bold text-ink-900 mb-1">اختصاص به اثر سبز</p>
      <p className="text-[11px] text-ink-500 mb-3">
        ارزش این تحویل: <span className="font-bold text-brand-600">{formatToman(totalValue)} تومان</span>
      </p>

      {(projects || []).length === 0 ? (
        <p className="text-xs text-ink-500">در حال حاضر طرحی برای مشارکت فعال نیست.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {allocations.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                className="flex-1 rounded-lg border border-brand-100 px-2.5 py-2 text-xs"
                value={a.project}
                onChange={(e) => updateAllocation(i, { project: e.target.value })}
              >
                <option value="">انتخاب طرح…</option>
                {(projects || []).map((p) => (
                  <option key={p.uid} value={p.uid}>
                    {p.icon} {p.title}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="مبلغ"
                className="w-24 rounded-lg border border-brand-100 px-2.5 py-2 text-xs text-center"
                value={a.amount}
                onChange={(e) => updateAllocation(i, { amount: e.target.value })}
              />
            </div>
          ))}
          {allocations.length < (projects || []).length && (
            <button
              type="button"
              className="text-[11px] text-brand-600 font-medium self-start"
              onClick={() => setAllocations((prev) => [...prev, { project: "", amount: "" }])}
            >
              + افزودن طرح دیگر (مشارکت ترکیبی)
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 text-[11px]">
        <span className="text-ink-500">باقی‌مانده نزد شما</span>
        <span className={`font-bold ${remaining < 0 ? "text-red-600" : "text-ink-900"}`}>{formatToman(Math.max(0, remaining))} تومان</span>
      </div>

      {remaining < 0 && <p className="text-red-600 text-[11px] mt-1">مجموع مبالغ نمی‌تواند بیشتر از ارزش تحویل باشد.</p>}
      {contribute.error && <p className="text-red-600 text-[11px] mt-1">{(contribute.error as Error).message}</p>}

      <div className="flex gap-2 mt-4">
        <Button variant="secondary" onClick={() => setOpen(false)}>
          انصراف
        </Button>
        <Button full loading={contribute.isPending} disabled={!canSubmit} onClick={handleSubmit}>
          ثبت مشارکت
        </Button>
      </div>

      <Link to="/green-impact/projects" className="block text-center text-[11px] text-brand-600 font-medium mt-3">
        مشاهده همه طرح‌های اثر سبز
      </Link>
    </Card>
  );
}
