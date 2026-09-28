import axios from "axios";
import { useAuthStore } from "../store/auth";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// استخراج پیام خطا از پاسخ DRF. علاوه بر message/detail، خطاهای
// serializers.ValidationError ساده (رشته یا دیکشنری فیلد↔[پیام‌ها]) هم
// معمولاً به‌صورت non_field_errors یا کلید هر فیلد برمی‌گردند — قبلاً این دو
// حالت نادیده گرفته می‌شدند و کاربر فقط پیام عمومی «خطا در ارتباط با سرور»
// را می‌دید، حتی وقتی بک‌اند دلیل دقیق را برگردانده بود.
function extractErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.detail === "string") return obj.detail;
  if (Array.isArray(obj.non_field_errors) && typeof obj.non_field_errors[0] === "string") {
    return obj.non_field_errors[0] as string;
  }
  for (const value of Object.values(obj)) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0] as string;
  }
  return undefined;
}

// ---- تمدید خودکار توکن ----
// قبلاً هر پاسخ ۴۰۱ مستقیم کاربر را از حساب بیرون می‌انداخت و توکن refresh اصلاً
// استفاده نمی‌شد. حالا: ۴۰۱ → یک بار تمدید (single-flight) → تکرار درخواست.
// فقط اگر خودِ سرور توکن refresh را رد کند (نه قطعی اینترنت) خروج انجام می‌شود.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${API_BASE_URL}/api/v1/auth/token/refresh/`, { refresh: refreshToken });
    const access = res.data?.access as string | undefined;
    if (!access) return null;
    setTokens(access, (res.data?.refresh as string | undefined) || refreshToken);
    return access;
  } catch (e) {
    const status = axios.isAxiosError(e) ? e.response?.status : undefined;
    if (status === 401 || status === 400 || status === 403) logout(); // توکن واقعاً باطل شده
    return null; // قطعی شبکه/خطای سرور: نشست حفظ می‌شود
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config as (typeof error.config & { _retried?: boolean }) | undefined;
    const status = error?.response?.status;
    if (status === 401 && original && !original._retried && useAuthStore.getState().refreshToken) {
      original._retried = true;
      refreshing = refreshing ?? refreshAccessToken().finally(() => { refreshing = null; });
      const newAccess = await refreshing;
      if (newAccess) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      }
    }
    const message =
      extractErrorMessage(error?.response?.data) ||
      (status === undefined
        ? "ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید."
        : "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
    return Promise.reject(new Error(message));
  }
);
