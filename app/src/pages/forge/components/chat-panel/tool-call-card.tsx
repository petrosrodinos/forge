import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ToolCall } from "@/features/chat/hooks/use-chat.hooks";

interface ToolCallCardProps {
  toolCall: ToolCall;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-surface border border-border rounded-lg text-xs">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="text-accent-light font-mono">{toolCall.name}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 flex flex-col gap-1">
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
