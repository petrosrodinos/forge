import { create } from "zustand";
import { apiFetch } from "@/utils/apiClient";
import type { User } from "@/interfaces";

interface AuthState {
  user: User | null;
  loading: boolean;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  fetchMe: async () => {
    try {
      const me = await apiFetch<User>("/api/auth/me");
      set({ user: me });
    } catch {
      set({ user: null });
    }
  },

  login: async (email, password) => {
    await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    await get().fetchMe();
  },

  logout: async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    set({ user: null });
  },

  initialize: async () => {
    set({ loading: true });
    await get().fetchMe();
    set({ loading: false });
  },
}));
