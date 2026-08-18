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
          <GreenImpactChoice requestUid={req.uid} totalValue={Number(req.weighing.total_value)} greenIntent={req.green_intent} />
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

/**
 * "صفحه انتخاب اثر" from the product flow — appears once a delivery's value
 * is known (weighing complete). Fully optional: doing nothing means the
 * citizen simply keeps the full amount already credited to their wallet by
 * complete_weighing(). Choosing to contribute debits that same wallet via
 * useContribute() (POST /green-impact/contribute/) — no parallel ledger.
 *
 * Interaction model: a single master "دریافت نقدی" slider sets how much of
 * the delivery's value stays as cash; the remainder is split evenly across
 * whichever projects the citizen taps on (toggle chips, not per-item drag —
 * keeps the "sum always = 100%" invariant trivially true, no rebalancing
 * math to get wrong). Defaults to 100% cash — nothing is ever pre-selected
 * on the citizen's behalf — UNLESS the citizen already told us, upfront in
 * the request wizard, that this delivery was meant for «اثر سبز» (green
 * intent). That's a non-binding preference, so it only pre-configures this
 * panel's starting point (opened, cash share nudged to 0%); the citizen
 * still has to actively pick projects and confirm before anything moves.
 */
function GreenImpactChoice({ requestUid, totalValue, greenIntent }: {
  requestUid: string; totalValue: number; greenIntent: "SELL" | "DONATE";
}) {
  const { data: existing, isLoading: existingLoading } = useMyContributions({ request: requestUid });
  const { data: projects } = useImpactProjects({ status: "ACTIVE" });
  const contribute = useContribute();

  const [open, setOpen] = useState(greenIntent === "DONATE");
  const [cashPct, setCashPct] = useState(greenIntent === "DONATE" ? 0 : 100);
  const [selected, setSelected] = useState<string[]>([]);
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

  const poolPct = 100 - cashPct;
  const cashAmt = Math.round((totalValue * cashPct) / 100);
  const poolAmt = totalValue - cashAmt;
  const perProjectPct = selected.length ? poolPct / selected.length : 0;
  const perProjectBase = selected.length ? Math.floor(poolAmt / selected.length) : 0;
  const amounts: Record<string, number> = {};
  selected.forEach((uid, i) => {
    // last selected project absorbs the rounding remainder so the sum is exact
    amounts[uid] = i === selected.length - 1 ? poolAmt - perProjectBase * (selected.length - 1) : perProjectBase;
  });
  const canSubmit = selected.length > 0 && poolAmt > 0;

  function toggleProject(uid: string) {
    setSelected((prev) => {
      if (prev.includes(uid)) return prev.filter((u) => u !== uid);
      const next = [...prev, uid];
      if (cashPct === 100) setCashPct(80); // first pick nudges 20% into the pool so the split isn't stuck at zero
      return next;
    });
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    const res = await contribute.mutateAsync({
      request: requestUid,
      allocations: selected.map((uid) => ({ project: uid, amount: amounts[uid] })),
    });
    setLastContributions(res.contributions);
    setShowSuccess(true);
    setOpen(false);
    setCashPct(100);
    setSelected([]);
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
      <p className="text-sm font-bold text-ink-900 mb-3">نحوهٔ تخصیص اثر سبز</p>

      {/* Central gauge: green ring share = cash%, showing the delivery's total value */}
      <div className="relative w-28 h-28 mx-auto mb-4">
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(#16a34a 0% ${cashPct}%, #cffde3 ${cashPct}% 100%)` }}
        />
        <div className="absolute inset-[7px] rounded-full bg-white flex flex-col items-center justify-center text-center px-2">
          <p className="text-[9.5px] text-ink-500">ارزش این تحویل</p>
          <p className="text-sm font-extrabold text-ink-900 leading-tight">{formatToman(totalValue)}</p>
          <p className="text-[9px] text-ink-400">تومان</p>
        </div>
      </div>

      {/* Master cash/pool slider */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-medium text-ink-800">💵 دریافت نقدی</span>
          <span className="font-bold text-brand-600">{cashPct}٪ · {formatToman(cashAmt)} تومان</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={cashPct}
          onChange={(e) => setCashPct(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
      </div>

      {(projects || []).length === 0 ? (
        <p className="text-xs text-ink-500">در حال حاضر طرحی برای مشارکت فعال نیست.</p>
      ) : (
        <div className="flex flex-col gap-1 border-t border-brand-50 pt-2">
          {(projects || []).map((p) => {
            const isSel = selected.includes(p.uid);
            return (
              <button key={p.uid} type="button" onClick={() => toggleProject(p.uid)} className="text-right">
                <div className="flex items-center gap-2.5 py-1.5">
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] shrink-0 transition ${
                      isSel ? "bg-brand-500 border-brand-500 text-white" : "border-ink-200 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-sm shrink-0">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink-800 truncate">{p.title}</p>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${isSel ? perProjectPct : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-left shrink-0 w-16">
                    <p className="text-[11px] font-bold text-ink-900">{isSel ? Math.round(perProjectPct) : 0}٪</p>
                    <p className="text-[10px] text-ink-500">{formatToman(isSel ? amounts[p.uid] : 0)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-brand-50 text-[11px]">
        <span className="text-ink-500 shrink-0">ترکیب انتخاب‌شده</span>
        <span className="font-bold text-ink-900 flex items-center gap-1 flex-wrap justify-end" dir="ltr">
          <bdi>{formatToman(cashAmt)}</bdi>
          {selected.map((uid) => (
            <span key={uid} className="flex items-center gap-1">
              <span className="font-normal text-ink-400">+</span>
              <bdi>{formatToman(amounts[uid])}</bdi>
            </span>
          ))}
        </span>
      </div>

      {contribute.error && <p className="text-red-600 text-[11px] mt-1">{(contribute.error as Error).message}</p>}

      <div className="flex gap-2 mt-4">
        <Button variant="secondary" onClick={() => setOpen(false)}>
          انصراف
        </Button>
        <Button full loading={contribute.isPending} disabled={!canSubmit} onClick={handleSubmit}>
          تأیید و ثبت مشارکت
        </Button>
      </div>

      <Link to="/green-impact/projects" className="block text-center text-[11px] text-brand-600 font-medium mt-3">
        مشاهده همه طرح‌های اثر سبز
      </Link>
    </Card>
  );
}
