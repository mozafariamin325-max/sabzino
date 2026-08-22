import { Link } from "react-router-dom";
import { useMyRequests } from "../api/queries";
import { Card, CenterLoading, EmptyState, StatusPill, TopBar } from "../components/ui";
import { STATUS_LABELS } from "../api/types";
import { toJalali } from "../lib/format";

export default function RequestsList() {
  const { data: requests, isLoading } = useMyRequests();

  return (
    <div>
      <TopBar title="درخواست‌های من" />
      <div className="px-4">
        {isLoading ? (
          <CenterLoading />
        ) : !requests || requests.length === 0 ? (
          <EmptyState icon="📦" title="هنوز درخواستی ثبت نکرده‌اید" subtitle="برای شروع، یک درخواست جمع‌آوری ثبت کنید." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {requests.map((r) => (
              <Link to={`/requests/${r.uid}`} key={r.uid}>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-ink-900">#{r.code}</p>
                    <StatusPill status={r.status} label={STATUS_LABELS[r.status] || r.status_display} />
                  </div>
                  <p className="text-[11px] text-ink-500 mt-1">{toJalali(r.created_at)}</p>
                  <p className="text-xs text-ink-700 mt-2">{r.materials.map((m) => m.name).join("، ")}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
