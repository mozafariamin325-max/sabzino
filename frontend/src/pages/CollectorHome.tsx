import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useAcceptRequest, useAdvanceRequest, useCollectorProfile, useCollectorTodayStats, useDismissRequest,
  useMaterialCategories, useMyAssignments, useNearbyOpenRequests, useToggleOnline, useWeighIn,
} from "../api/queries";
import { Button, Card, CenterLoading, EmptyState, StatusPill, TopBar } from "../components/ui";
import { STATUS_LABELS } from "../api/types";
import { formatToman, toJalaliTime } from "../lib/format";

const NEXT_ACTION_LABEL: Record<string, string> = {
  ACCEPTED: "شروع حرکت به سمت مقصد",
  ON_THE_WAY: "رسیدم",
  ARRIVED: "جمع‌آوری شد",
};

export default function CollectorHome() {
  const { data: profile, isLoading: profileLoading } = useCollectorProfile();
  const toggleOnline = useToggleOnline();
  const { data: nearby } = useNearbyOpenRequests();
  const { data: assignments } = useMyAssignments();
  const { data: todayStats } = useCollectorTodayStats();
  const acceptRequest = useAcceptRequest();
  const dismissRequest = useDismissRequest();
  const advanceRequest = useAdvanceRequest();
  const weighIn = useWeighIn();
  const { data: categories } = useMaterialCategories();
  const [weighForm, setWeighForm] = useState<{ uid: string; material: string; weight: string } | null>(null);

  if (profileLoading) return <CenterLoading />;

  if (!profile) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-5xl mb-4">🚚</p>
        <p className="font-bold text-ink-900 mb-2">هنوز به‌عنوان جمع‌آور ثبت‌نام نکرده‌اید</p>
        <Link to="/collector/register">
          <Button className="mt-3">ثبت‌نام به‌عنوان جمع‌آور</Button>
        </Link>
      </div>
    );
  }

  if (profile.verification_status !== "APPROVED") {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-5xl mb-4">⏳</p>
        <p className="font-bold text-ink-900 mb-1">در انتظار تأیید مدیر</p>
        <p className="text-sm text-ink-500">مدارک شما در حال بررسی است. پس از تأیید می‌توانید مأموریت دریافت کنید.</p>
      </div>
    );
  }

  const activeAssignments = (assignments || []).filter((r) => !["COMPLETED", "CANCELLED"].includes(r.status));
  const allMaterials = (categories || []).flatMap((c) => c.materials);

  async function submitWeighIn() {
    if (!weighForm) return;
    await weighIn.mutateAsync({ uid: weighForm.uid, material: Number(weighForm.material), weight_kg: Number(weighForm.weight) });
    setWeighForm(null);
  }

  return (
    <div>
      <TopBar
        title="داشبورد جمع‌آور"
        right={
          <Button
            variant={profile.is_online ? "primary" : "secondary"}
            loading={toggleOnline.isPending}
            onClick={() => {
              navigator.geolocation?.getCurrentPosition(
                (pos) => toggleOnline.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => toggleOnline.mutate(undefined)
              );
            }}
          >
            {profile.is_online ? "آنلاین" : "آفلاین"}
          </Button>
        }
      />

      <div className="px-4 grid grid-cols-3 gap-3 mb-3">
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-brand-600">{profile.completed_jobs}</p>
          <p className="text-[11px] text-ink-500">مأموریت تکمیل‌شده</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-brand-600">{profile.rating_avg} ⭐</p>
          <p className="text-[11px] text-ink-500">امتیاز</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-brand-600">{profile.acceptance_rate}%</p>
          <p className="text-[11px] text-ink-500">نرخ موفقیت</p>
        </Card>
      </div>

      <div className="px-4 mb-5">
        <Card className="p-3.5 flex items-center justify-between bg-brand-50/60">
          <p className="text-xs font-bold text-ink-900">📅 امروز</p>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-base font-extrabold text-brand-700">{todayStats?.accepted_today ?? "—"}</p>
              <p className="text-[10px] text-ink-500">پذیرفته</p>
            </div>
            <div className="text-center">
              <p className="text-base font-extrabold text-brand-700">{todayStats?.completed_today ?? "—"}</p>
              <p className="text-[10px] text-ink-500">تکمیل‌شده</p>
            </div>
          </div>
        </Card>
      </div>

      {activeAssignments.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="font-bold text-sm text-ink-900 mb-3">مأموریت‌های فعال</h2>
          <div className="flex flex-col gap-3">
            {activeAssignments.map((r) => (
              <Card key={r.uid} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm">#{r.code}</p>
                  <StatusPill status={r.status} label={STATUS_LABELS[r.status]} />
                </div>
                <p className="text-xs text-ink-600">{r.address_text_snapshot}</p>
                <p className="text-xs text-ink-500 mt-1">{r.materials.map((m) => m.name).join("، ")} — {r.amount_range_display}</p>

                {["ACCEPTED", "ON_THE_WAY", "ARRIVED"].includes(r.status) && (
                  <Button full className="mt-3" loading={advanceRequest.isPending} onClick={() => advanceRequest.mutate(r.uid)}>
                    {NEXT_ACTION_LABEL[r.status]}
                  </Button>
                )}

                {r.status === "COLLECTED" &&
                  (weighForm?.uid === r.uid ? (
                    <div className="mt-3 flex flex-col gap-2 bg-brand-50 rounded-xl p-3">
                      <select
                        className="rounded-lg border border-brand-200 px-2 py-2 text-sm"
                        value={weighForm.material}
                        onChange={(e) => setWeighForm({ ...weighForm, material: e.target.value })}
                      >
                        <option value="">ماده را انتخاب کنید</option>
                        {r.materials.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="وزن (کیلوگرم)"
                        className="rounded-lg border border-brand-200 px-2 py-2 text-sm"
                        value={weighForm.weight}
                        onChange={(e) => setWeighForm({ ...weighForm, weight: e.target.value })}
                      />
                      <Button loading={weighIn.isPending} disabled={!weighForm.material || !weighForm.weight} onClick={submitWeighIn}>
                        ثبت وزن و تسویه
                      </Button>
                    </div>
                  ) : (
                    <Button full variant="secondary" className="mt-3" onClick={() => setWeighForm({ uid: r.uid, material: String(allMaterials[0]?.id || ""), weight: "" })}>
                      وزن‌کشی و تسویه
                    </Button>
                  ))}
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="px-4">
        <h2 className="font-bold text-sm text-ink-900 mb-3">درخواست‌های نزدیک</h2>
        {!nearby ? (
          <CenterLoading />
        ) : nearby.length === 0 ? (
          <EmptyState icon="🗺️" title="درخواست بازی در نزدیکی شما نیست" subtitle="وضعیت آنلاین را روشن نگه دارید." />
        ) : (
          <div className="flex flex-col gap-3">
            {nearby.map((r) => (
              <Card key={r.uid} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm">#{r.code}</p>
                  <div className="flex items-center gap-1.5">
                    {r.distance_km != null && (
                      <span className="text-[10.5px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                        📍 {r.distance_km.toFixed(1)} کیلومتر
                      </span>
                    )}
                    <p className="text-xs text-brand-600 font-bold">{formatToman(r.estimated_value)} ت (تخمینی)</p>
                  </div>
                </div>
                <p className="text-xs text-ink-600 mt-1">{r.address_text_snapshot}</p>
                <p className="text-xs text-ink-500 mt-1">{r.materials.map((m) => m.name).join("، ")} — {r.amount_range_display}</p>
                <p className="text-[10px] text-ink-400 mt-1">{toJalaliTime(r.created_at)}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="secondary"
                    className="text-xs px-4"
                    loading={dismissRequest.isPending}
                    onClick={() => dismissRequest.mutate(r.uid)}
                  >
                    رد کردن
                  </Button>
                  <Button full loading={acceptRequest.isPending} onClick={() => acceptRequest.mutate(r.uid)}>
                    پذیرش مأموریت
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
