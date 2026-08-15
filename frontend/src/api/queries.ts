import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { useAuthStore } from "../store/auth";
import type {
  Address, CollectionRequest, GreenPoints, Listing, MaterialCategory,
  Paginated, RecyclingStation, Wallet, WalletTransaction,
} from "./types";

// ---------------- AUTH ----------------
export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (payload: { identifier: string; password: string }) => {
      const { data } = await api.post("/auth/login/", payload);
      return data;
    },
    onSuccess: (data) => setAuth({ access: data.access, refresh: data.refresh }, data.user),
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (payload: {
      first_name: string; last_name: string; email?: string; phone_number?: string;
      password: string; role?: string; referral_code?: string;
    }) => {
      const { data } = await api.post("/auth/register/", payload);
      return data;
    },
    onSuccess: (data) => setAuth({ access: data.access, refresh: data.refresh }, data.user),
  });
}

export function useMe(enabled: boolean) {
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get("/auth/me/");
      setUser(data.user);
      return data.user;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useAddresses() {
  return useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const { data } = await api.get<Address[] | Paginated<Address>>("/auth/addresses/");
      return Array.isArray(data) ? data : data.results;
    },
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Address>) => (await api.post("/auth/addresses/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

// ---------------- CATALOG ----------------
export function useMaterialCategories() {
  return useQuery({
    queryKey: ["material-categories"],
    queryFn: async () => (await api.get<Paginated<MaterialCategory>>("/materials/categories/")).data.results,
    staleTime: 5 * 60_000,
  });
}

export function useStations(coords?: { lat: number; lng: number }) {
  return useQuery({
    queryKey: ["stations", coords],
    queryFn: async () => {
      const params = coords ? { lat: coords.lat, lng: coords.lng } : {};
      const { data } = await api.get<{ stations: RecyclingStation[] }>("/stations/", { params });
      return data.stations;
    },
  });
}

// ---------------- WALLET & POINTS ----------------
export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: async () => (await api.get<{ wallet: Wallet }>("/wallet/me/")).data.wallet,
    refetchInterval: 30_000,
  });
}

export function useWalletTransactions() {
  return useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: async () => (await api.get<Paginated<WalletTransaction>>("/wallet/transactions/")).data.results,
  });
}

export function useRequestWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { amount: number; sheba_number?: string }) =>
      (await api.post("/wallet/withdrawals/request/", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });
}

export function useGreenPoints() {
  return useQuery({
    queryKey: ["points"],
    queryFn: async () => (await api.get<{ points: GreenPoints }>("/rewards/points/me/")).data.points,
    refetchInterval: 30_000,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => (await api.get("/rewards/leaderboard/")).data.leaderboard,
  });
}

// ---------------- COLLECTION REQUESTS (Citizen) ----------------
export function useMyRequests() {
  return useQuery({
    queryKey: ["my-requests"],
    queryFn: async () => (await api.get<Paginated<CollectionRequest>>("/collections/")).data.results,
    refetchInterval: 15_000,
  });
}

export function useRequestDetail(uid?: string) {
  return useQuery({
    queryKey: ["request", uid],
    queryFn: async () => (await api.get<CollectionRequest>(`/collections/${uid}/`)).data,
    enabled: !!uid,
    refetchInterval: 10_000,
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FormData) =>
      (await api.post("/collections/", payload, { headers: { "Content-Type": "multipart/form-data" } })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-requests"] }),
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => (await api.delete(`/collections/${uid}/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-requests"] }),
  });
}

// ---------------- COLLECTOR ----------------
export function useCollectorProfile() {
  return useQuery({
    queryKey: ["collector-profile"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/collectors/me/");
        return data.collector;
      } catch {
        return null;
      }
    },
  });
}

export function useRegisterCollector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, string>) => (await api.post("/collectors/register/", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collector-profile"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useToggleOnline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (coords?: { lat: number; lng: number }) =>
      (await api.post("/collectors/me/toggle-online/", coords || {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collector-profile"] }),
  });
}

export function useNearbyOpenRequests() {
  return useQuery({
    queryKey: ["nearby-requests"],
    queryFn: async () => (await api.get<{ requests: CollectionRequest[] }>("/collections/collector/nearby/")).data.requests,
    refetchInterval: 10_000,
  });
}

export function useMyAssignments() {
  return useQuery({
    queryKey: ["my-assignments"],
    queryFn: async () => (await api.get<Paginated<CollectionRequest>>("/collections/collector/my-assignments/")).data.results,
    refetchInterval: 10_000,
  });
}

export function useAcceptRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => (await api.post(`/collections/${uid}/accept/`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nearby-requests"] });
      qc.invalidateQueries({ queryKey: ["my-assignments"] });
    },
  });
}

export function useAdvanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => (await api.post(`/collections/${uid}/advance/`)).data,
    onSuccess: (_d, uid) => {
      qc.invalidateQueries({ queryKey: ["my-assignments"] });
      qc.invalidateQueries({ queryKey: ["request", uid] });
    },
  });
}

export function useWeighIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, material, weight_kg }: { uid: string; material: number; weight_kg: number }) =>
      (await api.post(`/collections/${uid}/weigh-in/`, { material, weight_kg })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-assignments"] });
      qc.invalidateQueries({ queryKey: ["my-requests"] });
    },
  });
}

// ---------------- MARKETPLACE ----------------
export function useListings(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["listings", params],
    queryFn: async () => (await api.get<Paginated<Listing>>("/marketplace/listings/", { params })).data.results,
  });
}

// ---------------- NOTIFICATIONS ----------------
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications/")).data.results,
    refetchInterval: 30_000,
  });
}
