import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { useChat } from "@/features/chat/hooks/use-chat.hooks";
import { ToolCallCard } from "@/pages/forge/components/chat-panel/tool-call-card";
import { Spinner } from "@/components/ui/Spinner";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";

export function ChatPanel() {
  const { activeFigure } = useForgeStore();
  const { messages, streaming, send } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    await send(text, activeFigure?.id);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col gap-1 msg-appear",
              msg.role === "user" ? "items-end" : "items-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm msg-text",
                msg.role === "user"
                  ? "bg-accent/20 text-slate-100"
                  : "bg-panel text-slate-200 border border-border",
              )}
            >
              {msg.content}
            </div>
            {msg.toolCalls?.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        ))}
        {streaming && (
          <div className="flex items-center gap-1 text-slate-500">
            <span className="dot-1">•</span>
            <span className="dot-2">•</span>
            <span className="dot-3">•</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about figures, skins, pipeline…"
            rows={1}
            className="flex-1 bg-panel border border-border rounded px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-accent/50 min-h-[44px] max-h-[200px]"
          />
          <button
            onClick={() => void handleSend()}
            disabled={streaming || !input.trim()}
            className="self-end p-2.5 bg-accent rounded text-white disabled:opacity-40 hover:bg-purple-700 transition-colors"
          >
            {streaming ? <Spinner className="w-4 h-4" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
