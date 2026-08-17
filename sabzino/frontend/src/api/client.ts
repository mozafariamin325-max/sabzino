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

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      "خطا در ارتباط با سرور. اتصال اینترنت خود را بررسی کنید.";
    return Promise.reject(new Error(message));
  }
);
