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
  roles: { role: Role; is_primary: boolean }[];
  is_staff?: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SabzinoUser | null;
  /** Which dashboard the "/" route renders — a user with several roles (e.g. citizen + collector) can switch. */
  activeView: string;
  setAuth: (tokens: { access: string; refresh: string }, user: SabzinoUser) => void;
  setUser: (user: SabzinoUser) => void;
  setActiveView: (view: string) => void;
  logout: () => void;
  hasRole: (role: Role) => boolean;
}

const STORAGE_KEY = "sabzino_auth_v1";

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null, user: null, activeView: "CITIZEN" };
    const parsed = JSON.parse(raw);
    return { activeView: "CITIZEN", ...parsed };
  } catch {
    return { accessToken: null, refreshToken: null, user: null, activeView: "CITIZEN" };
  }
}

function persist(state: Partial<AuthState>) {
  const { accessToken, refreshToken, user, activeView } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken, user, activeView }));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadInitial(),
  setAuth: (tokens, user) => {
    const next = { accessToken: tokens.access, refreshToken: tokens.refresh, user, activeView: "CITIZEN" };
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
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, refreshToken: null, user: null, activeView: "CITIZEN" });
  },
  hasRole: (role) => !!get().user?.roles?.some((r) => r.role === role),
}));
