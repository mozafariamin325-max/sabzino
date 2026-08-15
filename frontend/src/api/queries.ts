import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { useAuthStore } from "../store/auth";
import type {
  Address, CollectionRequest, GreenPoints, Listing, MaterialCategory,
  Paginated, RecyclingStation, Wallet, WalletTransaction, OrganizationDetail,
  ProfileChangeRequest, RecurringSchedule, OrgProfile, InventoryMovement, StockRow,
  VerificationItem,
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
      customer_type?: "INDIVIDUAL" | "ORGANIZATION";
      center_name?: string; manager_name?: string; manager_phone?: string;
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

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<Address> }) =>
      (await api.patch(`/auth/addresses/${id}/`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/auth/addresses/${id}/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

// ---------------- ORGANIZATION / PROFILE CHANGE ----------------
export function useOrganizationDetail() {
  return useQuery({
    queryKey: ["organization-detail"],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ organization: OrganizationDetail }>("/auth/organization/");
        return data.organization;
      } catch {
        return null;
      }
    },
  });
}

export function useProfileChangeRequests() {
  return useQuery({
    queryKey: ["profile-change-requests"],
    queryFn: async () => (await api.get<Paginated<ProfileChangeRequest>>("/auth/profile-change-requests/")).data.results,
  });
}

export function useRequestProfileChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { field_name: string; new_value: string }) =>
      (await api.post("/auth/profile-change-requests/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile-change-requests"] }),
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async (payload: Record<string, string>) => (await api.patch("/auth/me/", payload)).data,
    onSuccess: (data) => {
      setUser(data.user);
      qc.invalidateQueries({ queryKey: ["profile-change-requests"] });
    },
  });
}

// ---------------- RECURRING SCHEDULES ----------------
export function useRecurringSchedules() {
  return useQuery({
    queryKey: ["recurring-schedules"],
    queryFn: async () => (await api.get<Paginated<RecurringSchedule>>("/collections/recurring-schedules/")).data.results,
  });
}

export function useCreateRecurringSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post("/collections/recurring-schedules/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring-schedules"] }),
  });
}

export function useDeleteRecurringSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => (await api.delete(`/collections/recurring-schedules/${uid}/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring-schedules"] }),
  });
}

// ---------------- BUSINESS: ORG PROFILES (recycling-center/factory/wholesaler/business) ----------------
const ORG_ENDPOINTS: Record<string, string> = {
  RECYCLING_CENTER: "recycling-centers", FACTORY: "factories", WHOLESALER: "wholesalers", BUSINESS: "businesses",
};

export function useMyOrgProfile(kind: string) {
  return useQuery({
    queryKey: ["org-profile", kind],
    queryFn: async () => {
      try {
        const { data } = await api.get<Paginated<OrgProfile> | OrgProfile[]>(`/marketplace/${ORG_ENDPOINTS[kind]}/`);
        const list = Array.isArray(data) ? data : data.results;
        return list[0] || null;
      } catch {
        return null;
      }
    },
    enabled: !!ORG_ENDPOINTS[kind],
  });
}

export function useRegisterOrgProfile(kind: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post(`/marketplace/${ORG_ENDPOINTS[kind]}/`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-profile", kind] }),
  });
}

// ---------------- BUSINESS: INVENTORY IN/OUT ----------------
export function useInventoryMovements() {
  return useQuery({
    queryKey: ["inventory-movements"],
    queryFn: async () => (await api.get<Paginated<InventoryMovement>>("/marketplace/inventory/")).data.results,
  });
}

export function useCreateInventoryMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post("/marketplace/inventory/", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-movements"] });
      qc.invalidateQueries({ queryKey: ["stock-summary"] });
    },
  });
}

export function useStockSummary() {
  return useQuery({
    queryKey: ["stock-summary"],
    queryFn: async () => (await api.get<{ stock: StockRow[] }>("/marketplace/inventory/stock-summary/")).data.stock,
  });
}

// ---------------- ADMIN: VERIFICATION CENTER + CHARTS ----------------
export function useVerificationCenter() {
  return useQuery({
    queryKey: ["verification-center"],
    queryFn: async () => (await api.get<{ items: VerificationItem[]; count: number }>("/verification-center/")).data,
    refetchInterval: 20_000,
  });
}

export function useDecideVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, note }: { url: string; note?: string }) => (await api.post(url, { note: note || "" })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["verification-center"] }),
  });
}

export function useAdminCharts(days = 30) {
  return useQuery({
    queryKey: ["admin-charts", days],
    queryFn: async () => (await api.get("/charts/", { params: { days } })).data,
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
