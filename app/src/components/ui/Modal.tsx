import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  panelClassName?: string;
  /** Inner scroll area; default centers content (e.g. image previews). */
  contentClassName?: string;
}

export function Modal({ open, onClose, title, children, panelClassName, contentClassName }: ModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={cn(
          "relative z-10 bg-panel border border-border rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]",
          panelClassName,
        )}
      >
        <div
          className={cn(
            "flex items-center gap-4 px-4 py-3 border-b border-border shrink-0",
            title ? "justify-between" : "justify-end",
          )}
        >
          {title ? (
            <span id="modal-title" className="text-sm font-semibold text-slate-200">
              {title}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div
          className={cn(
            "p-4 overflow-auto min-h-0 flex-1 flex justify-center",
            contentClassName ?? "items-center",
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
