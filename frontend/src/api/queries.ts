import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { useAuthStore, type SabzinoUser } from "../store/auth";
import type {
  Address, CollectionRequest, GreenPoints, Listing, MaterialCategory,
  Paginated, RecyclingStation, Wallet, WalletTransaction, OrganizationDetail,
  ProfileChangeRequest, RecurringSchedule, OrgProfile, InventoryMovement, StockRow,
  VerificationItem, Rating, GlobalSearchResult,
  MaterialPrice, City, Challenge, LeaderboardRow, NeighborhoodLeaderboardRow,
  MyImpact, ClassifyResult, NearbyCollector,
  ImpactProject, ImpactContribution, MyGreenImpact, ImpactDashboard, PendingDonation,
  AdminCollector, AdminWithdrawal, FieldEvent, EventParticipant,
  StorePartner, StoreRedemption, AdminStoreRedemption, StorePartnerCategory,
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
      city: string;
    }) => {
      const { data } = await api.post("/auth/register/", payload);
      return data;
    },
    onSuccess: (data) => setAuth({ access: data.access, refresh: data.refresh }, data.user),
  });
}

// فاز ۱۵: ورود با کد پیامکی (OTP) — سه مرحله: درخواست کد، تأیید کد
// (خودکار ورود اگر حساب قدیمی باشد، یا registration_token اگر کاربر جدید
// باشد)، و تکمیل پروفایل (فقط کاربر جدید).
export function useRequestOtp() {
  return useMutation({
    mutationFn: async (payload: { phone_number: string }) => {
      const { data } = await api.post("/auth/otp/request/", payload);
      return data as { success: true; message: string; expires_in_seconds: number; test_code?: string };
    },
  });
}

export function useVerifyOtp() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (payload: { phone_number: string; code: string }) => {
      const { data } = await api.post("/auth/otp/verify/", payload);
      return data as
        | { success: true; is_new_user: false; message: string; user: SabzinoUser; access: string; refresh: string }
        | { success: true; is_new_user: true; message: string; registration_token: string };
    },
    onSuccess: (data) => {
      if (!data.is_new_user) setAuth({ access: data.access, refresh: data.refresh }, data.user);
    },
  });
}

export function useCompleteOtpProfile() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (payload: {
      registration_token: string; first_name: string; last_name: string; national_id: string; city: string;
    }) => {
      const { data } = await api.post("/auth/otp/complete-profile/", payload);
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
  // فاز ۱۹: مهمان (بدون توکن) آدرس ذخیره‌شده ندارد؛ بدون این گیت یک ۴۰۱ بی‌مورد می‌زد.
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    enabled: !!accessToken,
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

// ---------------- ADMIN: COLLECTOR (DRIVER) ACCOUNT MANAGEMENT ----------------
export function useAdminCollectors(params?: { verification_status?: string; search?: string }) {
  return useQuery({
    queryKey: ["admin-collectors", params],
    queryFn: async () => {
      const { data } = await api.get<Paginated<AdminCollector> | AdminCollector[]>("/collectors/admin/", { params });
      return Array.isArray(data) ? data : data.results;
    },
  });
}

export function useSuspendCollector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) =>
      (await api.post(`/collectors/admin/${id}/suspend/`, { note })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-collectors"] }),
  });
}

export function useReactivateCollector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: number; note?: string }) =>
      (await api.post(`/collectors/admin/${id}/reactivate/`, { note: note || "" })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-collectors"] }),
  });
}

// ---------------- ADMIN: WITHDRAWAL REQUESTS (کیف پول — برداشت وجه) ----------------
export function useAdminWithdrawals(params?: { status?: string }) {
  return useQuery({
    queryKey: ["admin-withdrawals", params],
    queryFn: async () => {
      const { data } = await api.get<Paginated<AdminWithdrawal> | AdminWithdrawal[]>("/wallet/admin/withdrawals/", { params });
      return Array.isArray(data) ? data : data.results;
    },
    refetchInterval: 20_000,
  });
}

export function useDecideWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, action, note }: { uid: string; action: "approve" | "reject" | "mark_paid"; note?: string }) =>
      (await api.post(`/wallet/admin/withdrawals/${uid}/${action}/`, { note: note || "" })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-withdrawals"] }),
  });
}

// ---------------- ADMIN: STORE PARTNERS + REDEMPTIONS (فروشگاه سبزینو) ----------------
export function useAdminStorePartners() {
  return useQuery({
    queryKey: ["admin-store-partners"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<StorePartner> | StorePartner[]>("/store/partners/");
      return Array.isArray(data) ? data : data.results;
    },
  });
}

export function useCreateStorePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string; category: StorePartnerCategory; description?: string;
      address?: string; contact_phone?: string; redeem_instructions?: string;
    }) => (await api.post("/store/partners/", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-store-partners"] });
      qc.invalidateQueries({ queryKey: ["store-partners"] });
    },
  });
}

export function useUpdateStorePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, ...payload }: { uid: string } & Partial<{
      name: string; category: StorePartnerCategory; description: string;
      address: string; contact_phone: string; redeem_instructions: string; is_active: boolean;
    }>) => (await api.patch(`/store/partners/${uid}/`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-store-partners"] });
      qc.invalidateQueries({ queryKey: ["store-partners"] });
    },
  });
}

export function useAdminStoreRedemptions(params?: { status?: string }) {
  return useQuery({
    queryKey: ["admin-store-redemptions", params],
    queryFn: async () => {
      const { data } = await api.get<Paginated<AdminStoreRedemption> | AdminStoreRedemption[]>("/store/admin/redemptions/", { params });
      return Array.isArray(data) ? data : data.results;
    },
    refetchInterval: 20_000,
  });
}

export function useDecideStoreRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, action, note }: { uid: string; action: "approve" | "reject" | "mark_fulfilled"; note?: string }) =>
      (await api.post(`/store/admin/redemptions/${uid}/${action}/`, { note: note || "" })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-store-redemptions"] }),
  });
}

// ---------------- ADMIN: COLLECTION REQUEST OVERSIGHT (رصد + اصلاح درخواست‌ها) ----------------
export function useAdminRequests(params?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ["admin-requests", params],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CollectionRequest> | CollectionRequest[]>("/collections/admin/", { params });
      return Array.isArray(data) ? data : data.results;
    },
    refetchInterval: 20_000,
  });
}

export function useAdminEditRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, reason, ...changes }: { uid: string; reason: string; address_text_snapshot?: string; description?: string }) => {
      const { data } = await api.post(`/collections/admin/${uid}/edit/`, { reason, ...changes });
      if (data?.success === false) throw new Error(data.message || "خطا در ویرایش درخواست");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-requests"] }),
  });
}

export function useAdminCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, reason }: { uid: string; reason: string }) => {
      const { data } = await api.post(`/collections/admin/${uid}/cancel/`, { reason });
      if (data?.success === false) throw new Error(data.message || "خطا در لغو درخواست");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-requests"] }),
  });
}

export function useAdminOverrideWeighing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, weight_kg, total_value, reason }: { uid: string; weight_kg: number; total_value?: number; reason: string }) => {
      const { data } = await api.post(`/collections/admin/${uid}/override_weighing/`, { weight_kg, total_value, reason });
      if (data?.success === false) throw new Error(data.message || "خطا در اصلاح وزن‌کشی");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-requests"] }),
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

export function useStations(coords?: { lat: number; lng: number }, guestCity?: string | null) {
  return useQuery({
    queryKey: ["stations", coords, guestCity],
    queryFn: async () => {
      const params: Record<string, unknown> = coords ? { lat: coords.lat, lng: coords.lng } : {};
      // فاز ۱۵: کاربر واردشده از پروفایلش فیلتر می‌شود (سمت بک‌اند)؛ مهمان
      // چون شهرش در پروفایل نیست، شهر انتخابی‌اش را صریح می‌فرستد.
      if (guestCity) params.city = guestCity;
      const { data } = await api.get<{ stations: RecyclingStation[] }>("/stations/", { params });
      return data.stations;
    },
  });
}

export function useNearbyCollectorsMap(coords?: { lat: number; lng: number }, guestCity?: string | null) {
  return useQuery({
    queryKey: ["nearby-collectors-map", coords, guestCity],
    queryFn: async () => {
      const params: Record<string, unknown> = coords ? { lat: coords.lat, lng: coords.lng } : {};
      if (guestCity) params.city = guestCity;
      const { data } = await api.get<{ collectors: NearbyCollector[] }>("/collectors/nearby/", { params });
      return data.collectors;
    },
  });
}

// ---------------- PRICING ("قیمت روز") ----------------
export function usePricing() {
  return useQuery({
    queryKey: ["pricing"],
    queryFn: async () =>
      (await api.get<Paginated<MaterialPrice> | MaterialPrice[]>("/pricing/", { params: { active: true } })).data,
    select: (data) => (Array.isArray(data) ? data : data.results),
    staleTime: 60_000,
  });
}

// ---------------- CITIES / LOCAL IDENTITY ----------------
export function useIdentityCities() {
  return useQuery({
    queryKey: ["cities", "identity-all"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<City> | City[]>("/locations/cities/", {
        params: { has_identity: true },
      });
      return Array.isArray(data) ? data : data.results;
    },
    staleTime: 5 * 60_000,
  });
}

export function useActiveIdentityCity() {
  return useQuery({
    queryKey: ["cities", "active-identity"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<City> | City[]>("/locations/cities/", {
        params: { has_identity: true },
      });
      const list = Array.isArray(data) ? data : data.results;
      return list[0] || null;
    },
    staleTime: 5 * 60_000,
  });
}

export function useAllCities() {
  return useQuery({
    queryKey: ["cities", "all"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<City> | City[]>("/locations/cities/");
      return Array.isArray(data) ? data : data.results;
    },
  });
}

export function useUpdateCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<City> }) =>
      (await api.patch(`/locations/cities/${id}/`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cities"] });
    },
  });
}

// ---------------- ADMIN: PRICES ----------------
export function useAdminPricing() {
  return useQuery({
    queryKey: ["pricing", "admin-all"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<MaterialPrice> | MaterialPrice[]>("/pricing/");
      return Array.isArray(data) ? data : data.results;
    },
  });
}

export function useSetPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { material: number; price_per_unit: number; market_price?: number | null }) =>
      (await api.post("/pricing/", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing"] });
    },
  });
}

// ---------------- ADMIN: B2B PURCHASE REQUESTS ----------------
export function useAdminPurchaseRequests() {
  return useQuery({
    queryKey: ["purchase-requests", "admin-all"],
    queryFn: async () => {
      const { data } = await api.get("/marketplace/purchase-requests/");
      return Array.isArray(data) ? data : data.results;
    },
  });
}

// ---------------- ENVIRONMENTAL IMPACT ("اثر من") ----------------
export function useMyImpact() {
  // Home.tsx بازطراحی‌شده این هوک را هم برای ویجت «پسماند/درخت/کربن» صدا
  // می‌زند؛ چون endpoint پشتش IsAuthenticated است، برای مهمان (بدون
  // accessToken) باید غیرفعال بماند تا یک ۴۰۱ بی‌فایده نزند — همان الگوی
  // فاز ۱۵ برای useWallet/useGreenPoints/useMyRequests/... .
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["my-impact"],
    queryFn: async () => (await api.get<{ impact: MyImpact }>("/impact/me/")).data.impact,
    enabled: !!accessToken,
  });
}

// ---------------- AI WASTE CLASSIFICATION (mock) ----------------
export function useClassifyWaste() {
  return useMutation({
    mutationFn: async ({ image, hint }: { image?: Blob; hint?: string }) => {
      const form = new FormData();
      if (image) form.append("image", image, "capture.jpg");
      if (hint) form.append("hint", hint);
      // Content-Type را عمداً دستی ست نمی‌کنیم: مرورگر/axios باید خودش
      // boundary درست multipart را اضافه کند؛ ست کردن دستی بدون boundary
      // در برخی مرورگرها باعث می‌شود سرور نتواند بدنه را parse کند.
      const { data } = await api.post<ClassifyResult>("/classify-waste/", form);
      return data;
    },
  });
}

// ---------------- WALLET & POINTS ----------------
export function useWallet() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["wallet"],
    queryFn: async () => (await api.get<{ wallet: Wallet }>("/wallet/me/")).data.wallet,
    refetchInterval: 30_000,
    enabled: !!accessToken,
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

// ---------------- STORE (فروشگاه سبزینو — خرج کیف‌پول در فروشگاه‌های همکار واقعی) ----------------
export function useStorePartners(params?: { category?: string }) {
  return useQuery({
    queryKey: ["store-partners", params],
    queryFn: async () => {
      const { data } = await api.get<Paginated<StorePartner> | StorePartner[]>("/store/partners/", { params });
      return Array.isArray(data) ? data : data.results;
    },
  });
}

export function useMyStoreRedemptions() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    enabled: !!accessToken,
    queryKey: ["store-redemptions"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<StoreRedemption> | StoreRedemption[]>("/store/redemptions/");
      return Array.isArray(data) ? data : data.results;
    },
  });
}

export function useRequestStoreRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { partner: string; amount: number }) =>
      (await api.post("/store/redemptions/request/", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
      qc.invalidateQueries({ queryKey: ["store-redemptions"] });
    },
  });
}

export function useGreenPoints() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["points"],
    queryFn: async () => (await api.get<{ points: GreenPoints }>("/rewards/points/me/")).data.points,
    refetchInterval: 30_000,
    enabled: !!accessToken,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => (await api.get<{ leaderboard: LeaderboardRow[] }>("/rewards/leaderboard/")).data.leaderboard,
  });
}

export function useNeighborhoodLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard", "neighborhoods"],
    queryFn: async () =>
      (await api.get<{ leaderboard: NeighborhoodLeaderboardRow[] }>("/rewards/leaderboard/neighborhoods/")).data
        .leaderboard,
  });
}

export function useChallenges() {
  return useQuery({
    queryKey: ["challenges"],
    queryFn: async () => (await api.get<Paginated<Challenge> | Challenge[]>("/rewards/challenges/")).data,
    select: (data) => (Array.isArray(data) ? data : data.results),
  });
}

// ---------------- COLLECTION REQUESTS (Citizen) ----------------
export function useMyRequests() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["my-requests"],
    queryFn: async () => (await api.get<Paginated<CollectionRequest>>("/collections/")).data.results,
    refetchInterval: 15_000,
    enabled: !!accessToken,
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
    // Content-Type را عمداً دستی ست نمی‌کنیم — چون این عکس هم دارد
    // (FormData)، اگر Content-Type را بدون boundary صریح ست کنیم برخی
    // مرورگرها diagonal بدنه‌ی multipart را با boundary نادرست می‌فرستند و
    // سرور نمی‌تواند آن را parse کند؛ axios با تشخیص خودکار FormData این
    // هدر را با boundary درست خودش می‌سازد.
    mutationFn: async (payload: FormData) =>
      (await api.post<{ success: true; message: string; request: CollectionRequest; estimated_points: number }>(
        "/collections/", payload
      )).data,
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
      qc.invalidateQueries({ queryKey: ["collector-today-stats"] });
    },
  });
}

export function useDismissRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => (await api.post(`/collections/${uid}/dismiss/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nearby-requests"] }),
  });
}

export function useCollectorTodayStats() {
  return useQuery({
    queryKey: ["collector-today-stats"],
    queryFn: async () =>
      (await api.get<{ accepted_today: number; completed_today: number }>("/collectors/me/today-stats/")).data,
    refetchInterval: 30_000,
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

export function usePurchaseListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, quantity_kg }: { uid: string; quantity_kg: number }) => {
      const { data } = await api.post(`/marketplace/listings/${uid}/purchase/`, { quantity_kg });
      if (data?.success === false) throw new Error(data.message || "خطا در ثبت درخواست خرید");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
}

// ---------------- RATINGS ----------------
export function useRatingsFor(toUser?: number) {
  return useQuery({
    queryKey: ["ratings", "for", toUser],
    queryFn: async () => (await api.get<Paginated<Rating> | Rating[]>("/ratings/", { params: { to_user: toUser } })).data,
    enabled: !!toUser,
    select: (data) => (Array.isArray(data) ? data : data.results),
  });
}

export function useMyGivenRatings() {
  return useQuery({
    queryKey: ["ratings", "given"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Rating> | Rating[]>("/ratings/", { params: { mine: "given" } });
      return Array.isArray(data) ? data : data.results;
    },
  });
}

export function useCreateRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      to_user: number; context_type: "COLLECTION" | "ORDER" | "STATION"; reference: string; score: number; comment?: string;
    }) => {
      const { data } = await api.post("/ratings/", payload);
      if (data?.success === false) throw new Error(data.message || "خطا در ثبت امتیاز");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ratings"] });
    },
  });
}

// ---------------- QR CODE ----------------
export function useQRCode(value?: string) {
  return useQuery({
    queryKey: ["qr", value],
    queryFn: async () => (await api.get<{ success: boolean; qr: string }>("/qr/", { params: { value } })).data.qr,
    enabled: !!value,
    staleTime: 5 * 60_000,
  });
}

// ---------------- ADMIN: GLOBAL SEARCH + EXPORT ----------------
export function useGlobalSearch(q: string) {
  return useQuery({
    queryKey: ["global-search", q],
    queryFn: async () => (await api.get<GlobalSearchResult>("/search/", { params: { q } })).data,
    enabled: q.trim().length > 1,
  });
}

export async function downloadAdminExport(type: "collections" | "orders") {
  const res = await api.get(`/export/`, { params: { type }, responseType: "blob" });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `sabzino-${type}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

// ---------------- NOTIFICATIONS ----------------
export function useNotifications() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications/")).data.results,
    refetchInterval: 30_000,
    enabled: !!accessToken,
  });
}

// ---------------- GREEN IMPACT ("اثر سبز من") ----------------
export function useImpactProjects(params?: { category?: string; status?: string }) {
  return useQuery({
    queryKey: ["impact-projects", params],
    queryFn: async () => (await api.get<ImpactProject[]>("/green-impact/projects/", { params })).data,
  });
}

export function useImpactProject(uid?: string) {
  return useQuery({
    queryKey: ["impact-project", uid],
    queryFn: async () => (await api.get<ImpactProject>(`/green-impact/projects/${uid}/`)).data,
    enabled: !!uid,
  });
}

export function useCreateImpactProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ImpactProject>) => (await api.post("/green-impact/projects/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["impact-projects"] }),
  });
}

export function useUpdateImpactProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, payload }: { uid: string; payload: Partial<ImpactProject> }) =>
      (await api.patch(`/green-impact/projects/${uid}/`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["impact-projects"] }),
  });
}

export function useMyGreenImpact() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["green-impact", "my-impact"],
    queryFn: async () => (await api.get<{ green_impact: MyGreenImpact }>("/green-impact/my-impact/")).data.green_impact,
    enabled: !!accessToken,
  });
}

export function useMyContributions(params?: { request?: string; project?: string }) {
  return useQuery({
    queryKey: ["green-impact", "contributions", params],
    queryFn: async () => (await api.get<ImpactContribution[]>("/green-impact/contributions/", { params })).data,
  });
}

export function useContribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { request?: string; allocations: { project: string; amount: number }[] }) => {
      const { data } = await api.post("/green-impact/contribute/", payload);
      if (data?.success === false) throw new Error(data.message || "خطا در ثبت مشارکت");
      return data as { success: true; contributions: ImpactContribution[] };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["impact-projects"] });
      qc.invalidateQueries({ queryKey: ["green-impact"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });
}

export function useMyPendingDonations() {
  return useQuery({
    queryKey: ["green-impact", "pending-donations"],
    queryFn: async () => (await api.get<PendingDonation[]>("/green-impact/pending-donations/")).data,
  });
}

export function useImpactDashboard() {
  return useQuery({
    queryKey: ["green-impact", "admin-dashboard"],
    queryFn: async () => (await api.get<{ dashboard: ImpactDashboard }>("/green-impact/dashboard/")).data.dashboard,
  });
}

// ---------------- FIELD EVENTS ----------------
export function useFieldEvents(all = false) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["field-events", all, !!accessToken],
    queryFn: async () => (await api.get<FieldEvent[]>("/rewards/events/", { params: all ? { all: 1 } : {} })).data,
  });
}

export function useRegisterFieldEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { uid: string; cancel?: boolean; note?: string }) =>
      (p.cancel
        ? await api.delete(`/rewards/events/${p.uid}/register/`)
        : await api.post(`/rewards/events/${p.uid}/register/`, { note: p.note ?? "" })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["field-events"] }),
  });
}

export function useSaveFieldEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { uid?: string; body: Record<string, unknown> }) =>
      p.uid ? (await api.patch(`/rewards/events/${p.uid}/`, p.body)).data : (await api.post("/rewards/events/", p.body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["field-events"] }),
  });
}

export function useDeleteFieldEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => (await api.delete(`/rewards/events/${uid}/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["field-events"] }),
  });
}

export function useEventParticipants(uid: string | null) {
  return useQuery({
    queryKey: ["event-participants", uid],
    enabled: !!uid,
    queryFn: async () => (await api.get<{ participants: EventParticipant[] }>(`/rewards/events/${uid}/participants/`)).data.participants,
  });
}

export function useAdminChallenges() {
  return useQuery({
    queryKey: ["challenges", "admin"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Challenge> | Challenge[]>("/rewards/challenges/", { params: { all: 1 } });
      return Array.isArray(data) ? data : data.results;
    },
  });
}

export function useSaveChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: number; body: Record<string, unknown> }) =>
      p.id ? (await api.patch(`/rewards/challenges/${p.id}/`, p.body)).data : (await api.post("/rewards/challenges/", p.body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges"] }),
  });
}

export function useDeleteChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/rewards/challenges/${id}/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges"] }),
  });
}
