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
  setAuth: (tokens: { access: string; refresh: string }, user: SabzinoUser) => void;
  setUser: (user: SabzinoUser) => void;
  logout: () => void;
  hasRole: (role: Role) => boolean;
}

const STORAGE_KEY = "sabzino_auth_v1";

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null, user: null };
    return JSON.parse(raw);
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

function persist(state: Partial<AuthState>) {
  const { accessToken, refreshToken, user } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken, user }));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadInitial(),
  setAuth: (tokens, user) => {
    const next = { accessToken: tokens.access, refreshToken: tokens.refresh, user };
    persist(next);
    set(next);
  },
  setUser: (user) => {
    set({ user });
    persist({ ...get(), user });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, refreshToken: null, user: null });
  },
  hasRole: (role) => !!get().user?.roles?.some((r) => r.role === role),
}));
