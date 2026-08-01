import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import {
  changePassword,
  forgotPassword,
  register,
  resetPassword,
  updateProfile,
} from "@/features/auth/services/auth.services";
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from "@/features/auth/interfaces/auth.interfaces";

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
    onSuccess: () => toast.success("Account created"),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not create account"),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (dto: ForgotPasswordDto) => forgotPassword(dto),
    onSuccess: () =>
      toast.success("If that email is registered, a reset link is on the way"),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not send reset email"),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (dto: ResetPasswordDto) => resetPassword(dto),
    onSuccess: () => toast.success("Password updated"),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not reset password"),
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (dto: UpdateProfileDto) => updateProfile(dto),
    onSuccess: (user) => {
      useAuthStore.setState({ user });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update profile"),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (dto: ChangePasswordDto) => changePassword(dto),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not change password"),
  });
}
