import { create } from "zustand";

interface InsufficientTokensModalState {
  isOpen: boolean;
  /** Bumps on every `open` so the modal host can remount (reliable reopen after close). */
  openSeq: number;
  required: number;
  balance: number;
  open: (required: number, balance: number) => void;
  close: () => void;
}

export const useInsufficientTokensModalStore = create<InsufficientTokensModalState>((set) => ({
  isOpen: false,
  openSeq: 0,
  required: 0,
  balance: 0,
  open: (required, balance) =>
    set((s) => ({ isOpen: true, required, balance, openSeq: s.openSeq + 1 })),
  close: () => set({ isOpen: false }),
}));

/** Call when an API returns 402 with `{ required, balance }` (e.g. fetch-based SSE routes). */
export function notifyInsufficientTokensIf402(status: number, body: unknown): void {
  if (status !== 402) return;
  if (typeof body !== "object" || body === null) return;
  const d = body as { required?: unknown; balance?: unknown };
  if (typeof d.required === "number" && typeof d.balance === "number") {
    useInsufficientTokensModalStore.getState().open(d.required, d.balance);
  }
}
