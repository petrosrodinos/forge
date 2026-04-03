import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Figure, Skin, SkinVariant, SkinImage } from "@/interfaces";

interface ForgeState {
  activeFigure: Figure | null;
  activeSkin: Skin | null;
  activeVariant: SkinVariant | null;
  selectedImage: SkinImage | null;
  chatPanelOpen: boolean;
  figurePanelOpen: boolean;

  setActiveFigure: (f: Figure | null) => void;
  setActiveSkin: (s: Skin | null) => void;
  setActiveVariant: (v: SkinVariant | null) => void;
  setSelectedImage: (i: SkinImage | null) => void;
  setChatPanelOpen: (open: boolean) => void;
  setFigurePanelOpen: (open: boolean) => void;
  /** Sync fresh server data without resetting the active skin selection. */
  syncFigureData: (fresh: Figure) => void;
}

export const useForgeStore = create<ForgeState>()(
  persist(
    (set) => ({
      activeFigure: null,
      activeSkin: null,
      activeVariant: null,
      selectedImage: null,
      chatPanelOpen: true,
      figurePanelOpen: true,

      setActiveFigure: (activeFigure) =>
        set({ activeFigure, activeSkin: null, activeVariant: null, selectedImage: null }),
      setActiveSkin: (activeSkin) =>
        set({ activeSkin, activeVariant: null, selectedImage: null }),
      setActiveVariant: (activeVariant) => set({ activeVariant }),
      setSelectedImage: (selectedImage) => set({ selectedImage }),
      setChatPanelOpen: (chatPanelOpen) => set({ chatPanelOpen }),
      setFigurePanelOpen: (figurePanelOpen) => set({ figurePanelOpen }),
      syncFigureData: (fresh) =>
        set((state) => ({
          activeFigure: fresh,
          // Keep current activeSkin if it still exists in fresh data, otherwise preserve it
          // (it may not have propagated to the query cache yet)
          activeSkin: state.activeSkin
            ? (fresh.skins.find((s) => s.id === state.activeSkin!.id) ?? state.activeSkin)
            : state.activeSkin,
        })),
    }),
    {
      name: "forge-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        chatPanelOpen: state.chatPanelOpen,
        figurePanelOpen: state.figurePanelOpen,
      }),
    },
  ),
);
