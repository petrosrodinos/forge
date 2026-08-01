import { apiFetch, jsonInit } from "@/utils/apiClient";
import type { User } from "@/interfaces";
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from "@/features/auth/interfaces/auth.interfaces";

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

export async function forgotPassword(dto: ForgotPasswordDto): Promise<void> {
  return apiFetch<void>("/api/auth/forgot-password", {
    method: "POST",
    ...jsonInit(dto),
  });
}

export async function resetPassword(dto: ResetPasswordDto): Promise<void> {
  return apiFetch<void>("/api/auth/reset-password", {
    method: "POST",
    ...jsonInit(dto),
  });
}

export async function updateProfile(dto: UpdateProfileDto): Promise<User> {
  return apiFetch<User>("/api/auth/me", {
    method: "PATCH",
    ...jsonInit(dto),
  });
}

export async function changePassword(dto: ChangePasswordDto): Promise<void> {
  return apiFetch<void>("/api/auth/password", {
    method: "POST",
    ...jsonInit(dto),
  });
}
