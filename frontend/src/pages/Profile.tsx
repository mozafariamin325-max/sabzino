import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useGreenPoints, useMyImpact, useProfileChangeRequests, useQRCode, useUpdateMe } from "../api/queries";
import { Button, Card, TopBar } from "../components/ui";
import RoleSwitcher from "../components/RoleSwitcher";
import { getAvailableViews } from "../lib/roles";
import { formatKg, formatNumber } from "../lib/format";

const XP_PER_LEVEL = 500;

const TIERS = [
  { min: 1, max: 1, name: "تازه‌کار", icon: "🌱", color: "text-slate-600 bg-slate-100" },
  { min: 2, max: 4, name: "دوستدار طبیعت", icon: "🌿", color: "text-brand-700 bg-brand-50" },
  { min: 5, max: 9, name: "قهرمان سبز", icon: "🏅", color: "text-amber-700 bg-amber-50" },
  { min: 10, max: Infinity, name: "سفیر سبزینو", icon: "👑", color: "text-violet-700 bg-violet-50" },
];

function tierForLevel(level: number) {
  return TIERS.find((t) => level >= t.min && level <= t.max) || TIERS[0];
}

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: points } = useGreenPoints();
  const { data: impact } = useMyImpact();
  const { data: pendingChanges } = useProfileChangeRequests();
  const updateMe = useUpdateMe();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || "", last_name: user?.last_name || "", phone_number: user?.phone_number || "",
  });

  const roles = user?.roles?.map((r) => r.role) || [];
  const myPending = (pendingChanges || []).filter((c) => c.status === "PENDING");
  const availableViews = getAvailableViews(user);
  const [showQr, setShowQr] = useState(false);
  const { data: qr, isLoading: qrLoading } = useQRCode(showQr ? user?.uid : undefined);

  async function saveEdits() {
    await updateMe.mutateAsync(form);
    setEditing(false);
  }

  return (
    <div>
      <TopBar title="پروفایل" />
      <div className="px-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center text-xl font-bold">
            {user?.first_name?.[0] || "س"}
          </div>
          <div className="flex-1">
            <p className="font-bold text-ink-900">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-ink-500 mt-0.5">{user?.phone_number || user?.email}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button className="text-xs text-brand-600 font-medium" onClick={() => setEditing((e) => !e)}>
              {editing ? "انصراف" : "ویرایش"}
            </button>
            <button
              className="flex items-center gap-1 text-xs text-red-600 font-medium"
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              خروج
            </button>
          </div>
        </Card>

        {points && (
          <Card className="p-4 mt-3">
            {(() => {
              const tier = tierForLevel(points.level);
              const withinLevel = ((points.xp % XP_PER_LEVEL) + XP_PER_LEVEL) % XP_PER_LEVEL;
              const pct = Math.min(100, Math.round((withinLevel / XP_PER_LEVEL) * 100));
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${tier.color}`}>
                        {tier.icon}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-ink-900">{tier.name}</p>
                        <p className="text-[11px] text-ink-500 mt-0.5">سطح {formatNumber(points.level)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-brand-600">{formatNumber(points.points)} 🌿</p>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10.5px] text-ink-400 mt-1.5">
                      {formatNumber(withinLevel)} از {formatNumber(XP_PER_LEVEL)} امتیاز تجربه تا سطح بعد
                    </p>
                  </div>
                </>
              );
            })()}
          </Card>
        )}

        {impact && (
          <Card className="p-4 mt-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-ink-900">اثر من بر محیط‌زیست</p>
              {impact.is_estimated && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  تخمینی
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-base font-extrabold text-brand-600">{formatKg(impact.total_kg_recycled)}</p>
                <p className="text-[10.5px] text-ink-500 mt-0.5">کیلوگرم بازیافت</p>
              </div>
              <div className="text-center">
                <p className="text-base font-extrabold text-brand-600">{formatKg(impact.co2_kg_saved_estimated)}</p>
                <p className="text-[10.5px] text-ink-500 mt-0.5">کیلوگرم CO₂ کاهش‌یافته</p>
              </div>
              <div className="text-center">
                <p className="text-base font-extrabold text-brand-600">{formatNumber(impact.completed_requests)}</p>
                <p className="text-[10.5px] text-ink-500 mt-0.5">درخواست تکمیل‌شده</p>
              </div>
            </div>
            {impact.note && <p className="text-[10.5px] text-ink-400 mt-3">{impact.note}</p>}
          </Card>
        )}

        {editing && (
          <Card className="p-4 mt-3 flex flex-col gap-2.5">
            <p className="text-[11px] text-ink-500">تغییر نام یا شماره موبایل باید توسط مدیر سبزینو تأیید شود و بلافاصله اعمال نمی‌شود.</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
                placeholder="نام" value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              />
              <input
                className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm"
                placeholder="نام خانوادگی" value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              />
            </div>
            <input
              className="rounded-xl border border-brand-100 px-3 py-2.5 text-sm" dir="ltr" style={{ textAlign: "right" }}
              placeholder="شماره موبایل" value={form.phone_number || ""}
              onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
            />
            {updateMe.error && <p className="text-red-600 text-xs">{(updateMe.error as Error).message}</p>}
            <Button full loading={updateMe.isPending} onClick={saveEdits}>ثبت درخواست تغییر</Button>
          </Card>
        )}

        {myPending.length > 0 && (
          <Card className="p-4 mt-3 bg-amber-50 border border-amber-200">
            <p className="text-xs font-bold text-amber-800 mb-2">در انتظار تأیید مدیر</p>
            {myPending.map((c) => (
              <p key={c.uid} className="text-[11px] text-amber-700">
                {c.field_display}: «{c.old_value}» ← «{c.new_value}»
              </p>
            ))}
          </Card>
        )}

        {availableViews.some((v) => v.key === "ADMIN") && (
          <Card className="p-4 mt-3">
            <p className="text-sm font-bold text-ink-900 mb-1">نمای پیش‌فرض داشبورد</p>
            <p className="text-[11px] text-ink-500 mb-1">هر وقت وارد سبزینو می‌شوید، همین نما اول باز می‌شود. هر زمان خواستید از همین‌جا عوضش کنید.</p>
            <RoleSwitcher compact />
          </Card>
        )}

        <Card className="p-4 mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">کد دعوت شما</p>
            <p className="text-xs text-ink-500 mt-0.5">دوستان‌تان را دعوت کنید و امتیاز بگیرید</p>
          </div>
          <span className="font-mono text-sm font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg">
            {user?.referral_code}
          </span>
        </Card>

        <Card className="p-4 mt-3">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowQr((v) => !v)}
          >
            <div className="text-right">
              <p className="text-sm font-medium">کد QR شناسایی من</p>
              <p className="text-[11px] text-ink-500 mt-0.5">برای شناسایی سریع در ایستگاه‌ها و تراکنش‌ها</p>
            </div>
            <span className="text-ink-300">{showQr ? "▲" : "▼"}</span>
          </button>
          {showQr && (
            <div className="flex flex-col items-center mt-3">
              {qrLoading ? (
                <p className="text-xs text-ink-400 py-4">در حال ساخت QR...</p>
              ) : qr ? (
                <img src={qr} alt="QR کاربر" className="w-36 h-36 rounded-lg border border-brand-100" />
              ) : null}
            </div>
          )}
        </Card>

        <div className="mt-5 flex flex-col gap-2 pb-24">
          <MenuLink to="/requests" icon="📦" label="درخواست‌های من" />
          <MenuLink to="/addresses" icon="📍" label="آدرس‌های من" />
          <MenuLink to="/wallet" icon="👛" label="کیف پول" />
          <MenuLink to="/stations" icon="🏪" label="ایستگاه‌های بازیافت" />
          <MenuLink to="/leaderboard" icon="🏆" label="رتبه‌بندی شهروندان" />

          {roles.includes("COLLECTOR") ? (
            <MenuLink to="/collector" icon="🚚" label="داشبورد جمع‌آور" />
          ) : (
            <MenuLink to="/collector/register" icon="🚚" label="ثبت‌نام به‌عنوان جمع‌آور" />
          )}
          {roles.includes("STATION_OPERATOR") && <MenuLink to="/station-operator" icon="🏪" label="پنل اپراتور ایستگاه" />}
          {roles.includes("FACTORY") && <MenuLink to="/business/FACTORY" icon="🏭" label="داشبورد کارخانه" />}
          {roles.includes("WHOLESALER") && <MenuLink to="/business/WHOLESALER" icon="🚛" label="داشبورد خریدار عمده" />}
          {roles.includes("RECYCLING_CENTER") && <MenuLink to="/business/RECYCLING_CENTER" icon="♻️" label="داشبورد مرکز بازیافت" />}
          {roles.includes("BUSINESS") && <MenuLink to="/business/BUSINESS" icon="🏬" label="داشبورد کسب‌وکار" />}
          {(user?.is_staff || roles.includes("MUNICIPALITY")) && <MenuLink to="/admin" icon="🛠️" label="داشبورد مدیریت" />}
        </div>
      </div>
    </div>
  );
}

function MenuLink({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link to={to}>
      <Card className="p-4 flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-ink-800 flex-1">{label}</span>
        <span className="text-ink-300">‹</span>
      </Card>
    </Link>
  );
}
