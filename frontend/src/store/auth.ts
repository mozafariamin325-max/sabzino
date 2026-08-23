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
  setActiveView: (view: string) => void;
  enterGuestMode: (city: string) => void;
  logout: () => void;
  hasRole: (role: Role) => boolean;
}

const STORAGE_KEY = "sabzino_auth_v1";

const DEFAULTS = {
  accessToken: null, refreshToken: null, user: null, activeView: "CITIZEN",
  isGuest: false, guestCity: null,
};

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
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
    const next = { ...DEFAULTS, isGuest: get().isGuest, guestCity: get().guestCity };
    persist(next);
    set(next);
  },
  hasRole: (role) => !!get().user?.roles?.some((r) => r.role === role),
}));
