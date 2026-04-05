import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/utils/cn";

interface ImageUploaderProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function ImageUploader({ onFile, disabled = false }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border/80 bg-surface/30 p-6 ring-1 ring-white/5 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-50 pointer-events-none"
          : "cursor-pointer",
        dragOver && !disabled && "drop-active",
      )}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => { if (!disabled) inputRef.current?.click(); }}
    >
      <UploadCloud size={24} className="text-slate-500" />
      <p className="text-xs text-slate-400">Drop image or click to upload</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />
    </div>
  );
}
