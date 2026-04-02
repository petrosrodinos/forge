import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/utils/cn";

interface ImageUploaderProps {
  onFile: (file: File) => void;
}

export function ImageUploader({ onFile }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
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
        "border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors",
        dragOver && "drop-active",
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <UploadCloud size={24} className="text-slate-500" />
      <p className="text-xs text-slate-400">Drop image or click to upload</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
