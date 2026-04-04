import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { register } from "@/features/auth/services/auth.services";
import type { RegisterDto } from "@/features/auth/interfaces/auth.interfaces";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  return { user, loading, login, logout };
}

export function useRegister() {
  return useMutation({
    mutationFn: (dto: RegisterDto) => register(dto),
  });
}
