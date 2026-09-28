import { create } from "zustand";

export type Role =
  | "SUPER_ADMIN" | "ADMIN" | "MUNICIPALITY" | "CITIZEN" | "COLLECTOR"
  | "STATION_OPERATOR" | "RECYCLING_CENTER" | "WHOLESALER" | "FACTORY"
  | "BUSINESS" | "SCHOOL" | "APARTMENT_MANAGER";

export interface SabzinoUser {
  id: number;
  uid: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  avatar: string | null;
  referral_code: string;
  city?: string;
  roles: { role: Role; is_primary: boolean }[];
  is_staff?: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SabzinoUser | null;
  /** Which dashboard the "/" route renders — a user with several roles (e.g. citizen + collector) can switch. */
  activeView: string;
  /** فاز ۱۵: حالت مهمان — بدون ورود، فقط مرور (نقشه/قیمت/پروژه‌ها)؛ اقدامات واقعی (ثبت درخواست/کیف‌پول) همچنان ورود واقعی می‌خواهند. */
  isGuest: boolean;
  guestCity: string | null;
  setAuth: (tokens: { access: string; refresh: string }, user: SabzinoUser) => void;
  setUser: (user: SabzinoUser) => void;
  /** تمدید خودکار توکن (بدون تغییر کاربر) */
  setTokens: (access: string, refresh: string) => void;
  setActiveView: (view: string) => void;
  enterGuestMode: (city: string) => void;
  logout: () => void;
  hasRole: (role: Role) => boolean;
}

const STORAGE_KEY = "sabzino_auth_v1";

export const DEFAULT_CITY = "یاسوج";

// کاربر بدون حساب، از همان اولین اجرا «مهمان» است و مستقیم وارد اپ می‌شود؛
// فقط برای ثبت نهایی درخواست/کیف‌پول ورود می‌خواهیم.
const DEFAULTS = {
  accessToken: null, refreshToken: null, user: null, activeView: "CITIZEN",
  isGuest: true, guestCity: DEFAULT_CITY as string | null,
};

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULTS, ...parsed };
    // اگر توکنی نیست، همیشه مهمان با یک شهر معتبر
    if (!merged.accessToken) return { ...merged, isGuest: true, guestCity: merged.guestCity || DEFAULT_CITY };
    return merged;
  } catch {
    return DEFAULTS;
  }
}

function persist(state: Partial<AuthState>) {
  const { accessToken, refreshToken, user, activeView, isGuest, guestCity } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken, user, activeView, isGuest, guestCity }));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadInitial(),
  setAuth: (tokens, user) => {
    const next = {
      accessToken: tokens.access, refreshToken: tokens.refresh, user, activeView: "CITIZEN",
      isGuest: false, guestCity: null,
    };
    persist(next);
    set(next);
  },
  setUser: (user) => {
    set({ user });
    persist({ ...get(), user });
  },
  setTokens: (access, refresh) => {
    set({ accessToken: access, refreshToken: refresh });
    persist({ ...get(), accessToken: access, refreshToken: refresh });
  },
  setActiveView: (view) => {
    set({ activeView: view });
    persist({ ...get(), activeView: view });
  },
  enterGuestMode: (city) => {
    const next = { ...DEFAULTS, isGuest: true, guestCity: city };
    persist(next);
    set(next);
  },
  logout: () => {
    // isGuest/guestCity عمداً دست‌نخورده می‌ماند: «خروج» یعنی پایان یک نشست
    // واقعی (یا انقضای توکن)، نه لزوماً خروج از حالت مرور مهمان — یک درخواست
    // ۴۰۱ ناخواسته در حالت مهمان نباید کاربر را وسط مرور بیرون بیندازد.
    // بعد از خروج، کاربر دوباره مهمان می‌شود (شهر قبلی‌اش حفظ می‌شود).
    const next = { ...DEFAULTS, isGuest: true, guestCity: get().guestCity || get().user?.city || DEFAULT_CITY };
    persist(next);
    set(next);
  },
  hasRole: (role) => !!get().user?.roles?.some((r) => r.role === role),
}));
