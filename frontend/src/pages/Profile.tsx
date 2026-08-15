import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useGreenPoints, useProfileChangeRequests, useQRCode, useUpdateMe } from "../api/queries";
import { Button, Card, TopBar } from "../components/ui";
import RoleSwitcher from "../components/RoleSwitcher";
import { getAvailableViews } from "../lib/roles";

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: points } = useGreenPoints();
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
            {points && (
              <p className="text-xs text-brand-600 mt-1">
                سطح {points.level} — {points.points} امتیاز سبزینو 🌿
              </p>
            )}
          </div>
          <button className="text-xs text-brand-600 font-medium" onClick={() => setEditing((e) => !e)}>
            {editing ? "انصراف" : "ویرایش"}
          </button>
        </Card>

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

        {availableViews.length > 1 && (
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

        <div className="mt-5 flex flex-col gap-2">
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

        <button
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="w-full mt-6 text-center text-red-600 text-sm font-medium py-3"
        >
          خروج از حساب
        </button>
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
