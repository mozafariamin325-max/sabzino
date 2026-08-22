import { useState } from "react";
import { useAuthStore } from "../store/auth";
import { getAvailableViews } from "../lib/roles";

/**
 * سوییچر نقش — فقط برای حساب‌هایی که واقعاً دسترسی مدیریت دارند (is_staff یا
 * نقش MUNICIPALITY) نمایش داده می‌شود؛ نه برای هر حساب چندنقشی (فاز ۱۴). یک
 * شهروند/راننده عادی هرگز این کنترل را نمی‌بیند — برای رفتن به داشبورد
 * جمع‌آور همان لینک همیشگی «داشبورد جمع‌آور» در پروفایل کافی است. برای ادمین
 * هم به‌جای یک ردیف تمام‌عرض که فضای صفحه را می‌گیرد، یک دراپ‌داون فشرده و
 * کوچک در بالای صفحه (مثل یک کنترل سربرگ) است.
 */
export default function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const activeView = useAuthStore((s) => s.activeView);
  const setActiveView = useAuthStore((s) => s.setActiveView);
  const [open, setOpen] = useState(false);
  const views = getAvailableViews(user);

  const isAdmin = views.some((v) => v.key === "ADMIN");
  if (!isAdmin || views.length < 2) return null;

  const current = views.find((v) => v.key === activeView) || views[0];

  if (compact) {
    return (
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {views.map((v) => (
            <button
              key={v.key}
              onClick={() => setActiveView(v.key)}
              className={`whitespace-nowrap text-xs px-3 py-2 rounded-xl font-medium border transition ${
                activeView === v.key ? "bg-brand-500 text-white border-brand-500" : "bg-white text-ink-600 border-brand-100"
              }`}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 relative z-30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-white border border-brand-100 text-ink-600 px-2.5 py-1.5 rounded-full shadow-sm"
      >
        <span>{current.icon}</span>
        <span>{current.label}</span>
        <span className="text-ink-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-4 mt-1.5 z-20 bg-white rounded-2xl shadow-lg border border-brand-100 p-1.5 min-w-[160px]">
            {views.map((v) => (
              <button
                key={v.key}
                onClick={() => {
                  setActiveView(v.key);
                  setOpen(false);
                }}
                className={`w-full text-right flex items-center gap-2 text-xs px-3 py-2 rounded-xl transition ${
                  activeView === v.key ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-600"
                }`}
              >
                <span>{v.icon}</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
