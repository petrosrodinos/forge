import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Figure, Skin, SkinVariant, SkinImage } from "@/interfaces";

interface ForgeState {
  activeFigure: Figure | null;
  activeSkin: Skin | null;
  activeVariant: SkinVariant | null;
  selectedImage: SkinImage | null;
  pipelinePanelOpen: boolean;
  rightPanelTab: "chat" | "pipeline" | "imagegen";

  setActiveFigure: (f: Figure | null) => void;
  setActiveSkin: (s: Skin | null) => void;
  setActiveVariant: (v: SkinVariant | null) => void;
  setSelectedImage: (i: SkinImage | null) => void;
  setPipelinePanelOpen: (open: boolean) => void;
  setRightPanelTab: (tab: "chat" | "pipeline" | "imagegen") => void;
}

export const useForgeStore = create<ForgeState>()(
  persist(
    (set) => ({
      activeFigure: null,
      activeSkin: null,
      activeVariant: null,
      selectedImage: null,
      pipelinePanelOpen: false,
      rightPanelTab: "chat",

      setActiveFigure: (activeFigure) =>
        set({ activeFigure, activeSkin: null, activeVariant: null, selectedImage: null }),
      setActiveSkin: (activeSkin) =>
        set({ activeSkin, activeVariant: null, selectedImage: null }),
      setActiveVariant: (activeVariant) => set({ activeVariant }),
      setSelectedImage: (selectedImage) => set({ selectedImage }),
      setPipelinePanelOpen: (pipelinePanelOpen) => set({ pipelinePanelOpen }),
      setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
    }),
    {
      name: "forge-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pipelinePanelOpen: state.pipelinePanelOpen,
        rightPanelTab: state.rightPanelTab,
      }),
    },
  ),
);
