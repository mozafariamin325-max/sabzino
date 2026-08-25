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

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    const message =
      extractErrorMessage(error?.response?.data) ||
      "خطا در ارتباط با سرور. اتصال اینترنت خود را بررسی کنید.";
    return Promise.reject(new Error(message));
  }
);
