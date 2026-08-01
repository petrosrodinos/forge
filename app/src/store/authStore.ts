import { create } from "zustand";
import { fetchMe, login as loginService, logout as logoutService } from "@/features/auth/services/auth.services";
import { queryClient } from "@/lib/queryClient";
import { useForgeStore } from "@/store/forgeStore";
import type { User } from "@/interfaces";

interface AuthState {
  user: User | null;
  loading: boolean;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

function clearSessionState() {
  queryClient.clear();
  useForgeStore.getState().setActiveFigure(null);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  fetchMe: async () => {
    try {
      const me = await fetchMe();
      set({ user: me });
    } catch {
      set({ user: null });
    }
  },

  login: async (email, password) => {
    clearSessionState();
    await loginService(email, password);
    await get().fetchMe();
  },

  logout: async () => {
    await logoutService().catch(() => {});
    clearSessionState();
    set({ user: null });
  },

  initialize: async () => {
    set({ loading: true });
    await get().fetchMe();
    set({ loading: false });
  },
}));
