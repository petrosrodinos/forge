import { useEffect, useRef, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { cn } from "@/utils/cn";

export interface SingleImagePickerProps {
  id?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

function isImageMime(file: File): boolean {
  return Boolean(file.type && file.type.startsWith("image/"));
}

export function SingleImagePicker({
  id,
  value,
  onChange,
  disabled,
  className,
  label = "Source image",
}: SingleImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rejectHint, setRejectHint] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!isImageMime(file)) {
      setRejectHint("Only image files are accepted.");
      return;
    }
    setRejectHint(null);
    onChange(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    pickFile(e.dataTransfer.files[0]);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    pickFile(e.target.files?.[0]);
  }

  function clear() {
    setRejectHint(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label ? (
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      ) : null}

      {value && previewUrl != null ? (
        <div className="relative rounded-lg border border-border overflow-hidden bg-surface">
          <img src={previewUrl} alt="" className="w-full max-h-40 object-contain bg-black/20" />
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-50"
            aria-label="Remove image"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={cn(
            "border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors",
            dragOver && "drop-active border-accent/50",
            disabled && "opacity-50 pointer-events-none cursor-not-allowed",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <ImageIcon size={22} className="text-slate-500" />
          <p className="text-xs text-slate-400 text-center">Drop one image or click to choose</p>
          <input
            id={id}
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={handleChange}
          />
        </div>
      )}

      {rejectHint ? <p className="text-[11px] text-amber-400">{rejectHint}</p> : null}
    </div>
  );
}
