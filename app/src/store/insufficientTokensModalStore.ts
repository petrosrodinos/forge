import { create } from "zustand";

interface InsufficientTokensModalState {
  isOpen: boolean;
  required: number;
  balance: number;
  open: (required: number, balance: number) => void;
  close: () => void;
}

export const useInsufficientTokensModalStore = create<InsufficientTokensModalState>((set) => ({
  isOpen: false,
  required: 0,
  balance: 0,
  open: (required, balance) => set({ isOpen: true, required, balance }),
  close: () => set({ isOpen: false }),
}));
