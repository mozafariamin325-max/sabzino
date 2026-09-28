import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useRegisterFieldEvent } from "../api/queries";
import type { FieldEvent } from "../api/types";
import { Button, Card } from "./ui";
import { formatNumber, toJalaliTime } from "../lib/format";

/** کارت چالش میدانی برای کاربر: جزئیات، ظرفیت، جایزه و ناهار، و ثبت‌نام/لغو. مهمان برای ثبت‌نام وارد می‌شود. */
export default function FieldEventCard({ event }: { event: FieldEvent }) {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const reg = useRegisterFieldEvent();
  const full = event.spots_left <= 0 && !event.is_registered;
  const pct = event.capacity ? Math.min(100, Math.round((event.registered_count / event.capacity) * 100)) : 0;

  function onClick() {
    if (!accessToken) return navigate("/login", { state: { from: location } });
    reg.mutate({ uid: event.uid, cancel: event.is_registered });
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center text-2xl shrink-0">🏞️</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">{event.title}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">📍 {event.location_name || "—"}</p>
          <p className="text-[11px] text-ink-500">📅 {toJalaliTime(event.event_date)}</p>
        </div>
      </div>

      {event.description && <p className="text-xs text-ink-600 leading-6 mt-3">{event.description}</p>}

      <div className="flex flex-wrap gap-1.5 mt-3">
        {event.lunch_included && <span className="text-[10.5px] bg-amber-50 text-amber-800 rounded-full px-2.5 py-1">🍽️ ناهار مهمان ما</span>}
        {event.prize_text && <span className="text-[10.5px] bg-brand-50 text-brand-700 rounded-full px-2.5 py-1">🎁 {event.prize_text}</span>}
      </div>
      {event.extra_info && <p className="text-[11px] text-ink-500 mt-2 leading-5">{event.extra_info}</p>}

      <div className="mt-3">
        <div className="flex justify-between text-[11px] text-ink-500 mb-1">
          <span>{formatNumber(event.registered_count)} نفر ثبت‌نام کرده‌اند</span>
          <span>{full ? "ظرفیت تکمیل" : `${formatNumber(event.spots_left)} جای خالی`}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Button
        full
        className="mt-3"
        variant={event.is_registered ? "secondary" : "primary"}
        loading={reg.isPending}
        disabled={full}
        onClick={onClick}
      >
        {event.is_registered ? "✓ ثبت‌نام شدی — لغو" : full ? "ظرفیت تکمیل شد" : accessToken ? "ثبت‌نام در چالش" : "ورود و ثبت‌نام در چالش"}
      </Button>
      {reg.error && <p className="text-[11px] text-red-600 text-center mt-2">{(reg.error as Error).message}</p>}
    </Card>
  );
}
