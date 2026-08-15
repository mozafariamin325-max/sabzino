import { useParams } from "react-router-dom";
import { useCancelRequest, useRequestDetail } from "../api/queries";
import { Button, Card, CenterLoading, StatusPill, TopBar } from "../components/ui";
import { STATUS_LABELS } from "../api/types";
import { formatKg, formatToman, toJalaliTime } from "../lib/format";

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
