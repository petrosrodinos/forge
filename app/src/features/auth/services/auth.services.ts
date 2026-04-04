import { apiFetch, jsonInit } from "@/utils/apiClient";
import type { User } from "@/interfaces";
import type { RegisterDto } from "@/features/auth/interfaces/auth.interfaces";

export async function fetchMe(): Promise<User> {
  return apiFetch<User>("/api/auth/me");
}

export async function login(email: string, password: string): Promise<void> {
  return apiFetch<void>("/api/auth/login", {
    method: "POST",
    ...jsonInit({ email, password }),
  });
}

export async function logout(): Promise<void> {
  return apiFetch<void>("/api/auth/logout", { method: "POST" });
}

export async function register(dto: RegisterDto): Promise<void> {
  return apiFetch<void>("/api/auth/register", { method: "POST", ...jsonInit(dto) });
}
