import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface PersistedValuesState {
  values: Record<string, unknown>;
  setValue: (key: string, value: unknown) => void;
  removeValue: (key: string) => void;
}

export const usePersistedValuesStore = create<PersistedValuesState>()(
  persist(
    (set) => ({
      values: {},
      setValue: (key, value) =>
        set((s) => ({ values: { ...s.values, [key]: value } })),
      removeValue: (key) =>
        set((s) => {
          const next = { ...s.values };
          delete next[key];
          return { values: next };
        }),
    }),
    {
      name: "app-persisted-values",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ values: state.values }),
    },
  ),
);
