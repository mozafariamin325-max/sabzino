/**
 * فاز ۱۹ — پیش‌نویس ویزارد ثبت درخواست برای کاربر مهمان.
 * مهمان می‌تواند همهٔ مراحل را پر کند و فقط در «ثبت نهایی» ورود می‌خواهیم؛
 * پیش‌نویس تا بازگشت از صفحهٔ ورود نگه داشته می‌شود (۲۴ ساعت). عکس ذخیره
 * نمی‌شود (فایل قابل سریال‌سازی نیست) — بعد از ورود دوباره قابل انتخاب است.
 */
const KEY = "sabzino_wizard_draft_v1";
const TTL_MS = 24 * 60 * 60 * 1000;

export interface WizardDraft {
  step: number;
  items: Record<number, { weightKg: number; isExact: boolean }>;
  newAddressTitle: string;
  newAddress: string;
  newPlate?: string;
  newLat: number | null;
  newLng: number | null;
  scheduleMode: "ONCE" | "RECURRING";
  preferredTime: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  dayOfWeek: number;
  dayOfMonth: number;
  preferredHour: number | null;
  description: string;
  greenIntent: "SELL" | "DONATE";
  /** مهمان «ثبت نهایی» را زده؛ بعد از ورود، درخواست خودکار ثبت می‌شود. */
  autoSubmit?: boolean;
  savedAt?: number;
}

export function saveDraft(d: WizardDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...d, savedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function loadDraft(): WizardDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as WizardDraft;
    if (!d.savedAt || Date.now() - d.savedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
