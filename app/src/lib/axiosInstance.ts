import axios, { type AxiosError, type InternalAxiosRequestConfig, isAxiosError } from "axios";
import { API_BASE_URL } from "@/utils/constants";
import { notifyInsufficientTokensIf402 } from "@/store/insufficientTokensModalStore";

function authRedirectAllowedPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/pricing"
  );
}

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

axiosInstance.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    if (isAxiosError(error) && error.response?.status === 402) {
      notifyInsufficientTokensIf402(402, error.response.data);
      return Promise.reject(error);
    }

    const cfg = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!cfg || error.response?.status !== 401) {
      return Promise.reject(error);
    }
    const url = cfg.url ?? "";
    if (url.includes("/api/auth/login") || url.includes("/api/auth/register")) {
      return Promise.reject(error);
    }
    if (url.includes("/api/auth/refresh")) {
      const path = window.location.pathname;
      if (!authRedirectAllowedPath(path)) {
        window.location.href = "/login";
      }
      return Promise.reject(new Error("Session expired"));
    }
    if (!cfg._retry) {
      cfg._retry = true;
      if (!refreshPromise) {
        refreshPromise = axiosInstance
          .post("/api/auth/refresh")
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null;
          });
      }
      try {
        await refreshPromise;
        return axiosInstance(cfg);
      } catch {
        const path = window.location.pathname;
        if (!authRedirectAllowedPath(path)) {
          window.location.href = "/login";
        }
        return Promise.reject(new Error("Session expired"));
      }
    }
    return Promise.reject(error);
  },
);
