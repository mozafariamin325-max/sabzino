import { useNotifications } from "../api/queries";
import { api } from "../api/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CenterLoading, EmptyState, TopBar } from "../components/ui";
import { toJalaliTime } from "../lib/format";

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const qc = useQueryClient();

  async function markAllRead() {
    await api.post("/notifications/read-all/");
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div>
      <TopBar
        title="اعلان‌ها"
        right={
          <button onClick={markAllRead} className="text-xs text-brand-600 font-medium">
            علامت‌گذاری همه به‌عنوان خوانده‌شده
          </button>
        }
      />
      <div className="px-4">
        {isLoading ? (
          <CenterLoading />
        ) : !notifications || notifications.length === 0 ? (
          <EmptyState icon="🔔" title="اعلانی وجود ندارد" />
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n: { uid: string; title: string; body: string; is_read: boolean; created_at: string }) => (
              <Card key={n.uid} className={`p-4 ${!n.is_read ? "border-r-4 border-brand-500" : ""}`}>
                <p className="text-sm font-bold text-ink-900">{n.title}</p>
                <p className="text-xs text-ink-600 mt-1">{n.body}</p>
                <p className="text-[10px] text-ink-400 mt-2">{toJalaliTime(n.created_at)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
