import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ToolCall } from "@/features/chat/interfaces/chat.interfaces";

interface ToolCallCardProps {
  toolCall: ToolCall;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/80 bg-surface/70 text-xs ring-1 ring-white/5">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="text-accent-light font-mono">{toolCall.name}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1 border-t border-border/60 px-3 pb-3 pt-2">
          <p className="text-slate-500 font-semibold">Input</p>
          <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(toolCall.input, null, 2)}
          </pre>
          {toolCall.result !== undefined && (
            <>
              <p className="text-slate-500 font-semibold mt-1">Result</p>
              <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
