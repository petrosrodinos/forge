import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { MoreVertical } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";

const GAP = 4;
const VIEW_MARGIN = 8;
/** Fallback height before menu is measured (≈3 items). */
const ESTIMATED_MENU_HEIGHT = 132;

export interface OptionsMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface OptionsMenuProps {
  items: OptionsMenuItem[];
  className?: string;
  triggerClassName?: string;
  triggerVariant?: "secondary" | "ghost";
  align?: "start" | "end";
  menuLabel?: string;
}

function computeMenuStyle(
  trigger: HTMLElement,
  menuEl: HTMLElement | null,
  align: "start" | "end",
): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  const measuredH = menuEl?.offsetHeight ?? 0;
  const measuredW = menuEl?.offsetWidth ?? 0;
  const menuH = measuredH > 0 ? measuredH : ESTIMATED_MENU_HEIGHT;
  const menuW = measuredW > 0 ? measuredW : 168;

  const spaceBelow = vh - VIEW_MARGIN - rect.bottom - GAP;
  const spaceAbove = rect.top - VIEW_MARGIN - GAP;
  const preferDown = spaceBelow >= menuH || spaceBelow >= spaceAbove;

  let top: number;
  if (preferDown) {
    top = rect.bottom + GAP;
    if (top + menuH > vh - VIEW_MARGIN) {
      top = Math.max(VIEW_MARGIN, vh - VIEW_MARGIN - menuH);
    }
  } else {
    top = rect.top - GAP - menuH;
    if (top < VIEW_MARGIN) {
      top = VIEW_MARGIN;
    }
  }

  const cappedMax = Math.max(80, vh - VIEW_MARGIN * 2);
  const maxHeight = Math.min(menuH, cappedMax);
  const overflowY = menuH > cappedMax ? ("auto" as const) : undefined;

  const style: CSSProperties = {
    position: "fixed",
    top,
    zIndex: 200,
    minWidth: "10.5rem",
    maxHeight,
    overflowY,
  };

  if (align === "end") {
    let right = vw - rect.right;
    right = Math.max(VIEW_MARGIN, right);
    const leftIfRightAligned = vw - right - menuW;
    if (leftIfRightAligned < VIEW_MARGIN) {
      right = Math.max(VIEW_MARGIN, vw - VIEW_MARGIN - menuW);
    }
    style.right = right;
    style.left = "auto";
  } else {
    let left = rect.left;
    left = Math.max(VIEW_MARGIN, left);
    if (left + menuW > vw - VIEW_MARGIN) {
      left = Math.max(VIEW_MARGIN, vw - VIEW_MARGIN - menuW);
    }
    style.left = left;
    style.right = "auto";
  }

  return style;
}

export function OptionsMenu({
  items,
  className,
  triggerClassName,
  triggerVariant = "ghost",
  align = "end",
  menuLabel = "Open menu",
}: OptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const alignRef = useRef(align);
  alignRef.current = align;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setMenuStyle(computeMenuStyle(trigger, menuRef.current, alignRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updatePosition();
    const id = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(id);
  }, [open, items.length, updatePosition]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleSelect(item: OptionsMenuItem) {
    if (item.disabled) return;
    setOpen(false);
    item.onSelect();
  }

  const menu =
    open && menuStyle ? (
      <div
        ref={menuRef}
        role="menu"
        style={menuStyle}
        className="rounded-md border border-border bg-panel py-1 shadow-lg"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => handleSelect(item)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                item.destructive
                  ? "text-red-400 hover:bg-red-400/10 enabled:hover:text-red-300"
                  : "text-slate-200 hover:bg-white/5",
              )}
            >
              {Icon ? <Icon size={14} className="shrink-0 opacity-80" aria-hidden /> : null}
              {item.label}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        className={cn("relative inline-flex", align === "end" && "justify-end", className)}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant={triggerVariant}
          size="sm"
          className={cn("p-1.5 min-w-0 shrink-0", triggerClassName)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={menuLabel}
          onClick={() => setOpen((v) => !v)}
        >
          <MoreVertical size={14} aria-hidden />
        </Button>
      </div>
      {menu ? createPortal(menu, document.body) : null}
    </>
  );
}
