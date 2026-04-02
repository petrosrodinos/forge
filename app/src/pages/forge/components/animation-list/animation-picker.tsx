import { ANIMATION_PRESETS } from "@/utils/constants";
import { cn } from "@/utils/cn";

interface AnimationPickerProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function AnimationPicker({ selected, onChange }: AnimationPickerProps) {
  function toggle(key: string) {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ANIMATION_PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => toggle(p.key)}
          className={cn(
            "text-xs px-2.5 py-1 rounded border transition-colors",
            selected.includes(p.key)
              ? "bg-accent/20 border-accent/40 text-accent-light"
              : "bg-transparent border-border text-slate-400 hover:border-slate-500",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
