import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/utils/cn";

interface ImageUploaderProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  /** Shows spinner and label inside the drop zone while the upload request is in flight. */
  isUploading?: boolean;
}

export function ImageUploader({ onFile, disabled = false, isUploading = false }: ImageUploaderProps) {
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
          ? "cursor-not-allowed pointer-events-none"
          : "cursor-pointer",
        disabled && !isUploading && "opacity-50",
        isUploading && "border-accent/35 bg-accent/5 ring-accent/15",
        dragOver && !disabled && "drop-active",
      )}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => { if (!disabled) inputRef.current?.click(); }}
    >
      {isUploading ? (
        <>
          <Spinner className="h-7 w-7 text-accent-light" />
          <p className="text-xs font-medium text-accent-light/90">Uploading image…</p>
        </>
      ) : (
        <>
          <UploadCloud size={24} className="text-slate-500" />
          <p className="text-xs text-slate-400">Drop image or click to upload</p>
        </>
      )}
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
