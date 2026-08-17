import type { SabzinoUser } from "../store/auth";

export interface ViewOption {
  key: string;
  label: string;
  icon: string;
}

const BUSINESS_ROLE_KEYS = ["FACTORY", "WHOLESALER", "RECYCLING_CENTER", "BUSINESS"] as const;

const VIEW_META: Record<string, { label: string; icon: string }> = {
  CITIZEN: { label: "شهروند / مشتری", icon: "🏠" },
  COLLECTOR: { label: "جمع‌آور", icon: "🚚" },
  STATION_OPERATOR: { label: "اپراتور ایستگاه", icon: "🏪" },
  FACTORY: { label: "کارخانه", icon: "🏭" },
  WHOLESALER: { label: "خریدار عمده", icon: "🚛" },
  RECYCLING_CENTER: { label: "مرکز بازیافت", icon: "♻️" },
  BUSINESS: { label: "کسب‌وکار", icon: "🏬" },
  ADMIN: { label: "مدیریت", icon: "🛠️" },
};

/**
 * A user can hold several roles at once (spec: "کاربر می‌تواند بیش از یک Role
 * داشته باشد"). Only the roles/permissions the account actually has are
 * offered here — no one can switch into a view they don't have access to.
 */
export function getAvailableViews(user: SabzinoUser | null | undefined): ViewOption[] {
  if (!user) return [];
  const roleKeys = new Set((user.roles || []).map((r) => r.role));
  const views: ViewOption[] = [{ key: "CITIZEN", ...VIEW_META.CITIZEN }];

  if (roleKeys.has("COLLECTOR")) views.push({ key: "COLLECTOR", ...VIEW_META.COLLECTOR });
  if (roleKeys.has("STATION_OPERATOR")) views.push({ key: "STATION_OPERATOR", ...VIEW_META.STATION_OPERATOR });
  for (const key of BUSINESS_ROLE_KEYS) {
    if (roleKeys.has(key)) views.push({ key, ...VIEW_META[key] });
  }
  if (user.is_staff || roleKeys.has("MUNICIPALITY")) views.push({ key: "ADMIN", ...VIEW_META.ADMIN });

  return views;
}

export function viewPath(key: string): string {
  if (key === "COLLECTOR") return "/collector";
  if (key === "STATION_OPERATOR") return "/station-operator";
  if (key === "ADMIN") return "/admin";
  if (BUSINESS_ROLE_KEYS.includes(key as (typeof BUSINESS_ROLE_KEYS)[number])) return `/business/${key}`;
  return "/";
}
