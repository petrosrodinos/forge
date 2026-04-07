import { useRef, useState } from "react";
import { Circle, MessageSquare, Send } from "lucide-react";
import { useChat } from "@/features/chat/hooks/use-chat.hooks";
import { ToolCallCard } from "@/pages/forge/components/chat-panel/tool-call-card";
import { Spinner } from "@/components/ui/Spinner";
import { useForgeStore } from "@/store/forgeStore";
import { Button } from "@/components/ui/Button";
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
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-border/80 bg-surface/40 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/12 text-accent-light ring-1 ring-accent/20">
          <MessageSquare className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight text-slate-100">Assistant</p>
          <p className="text-[0.65rem] text-slate-500">Figures, skins &amp; 3D</p>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
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
                "msg-text max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm shadow-sm",
                msg.role === "user"
                  ? "bg-accent/18 text-slate-100 ring-1 ring-accent/25"
                  : "border border-border/80 bg-panel/90 text-slate-200 ring-1 ring-white/5",
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
          <div className="flex items-center gap-1 text-slate-500" aria-hidden>
            <Circle className="dot-1 h-2 w-2 fill-current stroke-none" strokeWidth={0} />
            <Circle className="dot-2 h-2 w-2 fill-current stroke-none" strokeWidth={0} />
            <Circle className="dot-3 h-2 w-2 fill-current stroke-none" strokeWidth={0} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border/80 bg-panel/60 p-3 ring-1 ring-white/5">
        <div className="flex gap-2 rounded-xl border border-border/80 bg-surface/50 p-1.5 ring-1 ring-white/5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about figures, skins, and 3D…"
            rows={1}
            className="min-h-11 max-h-48 flex-1 resize-none rounded-lg border-0 bg-transparent px-2 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-0"
          />
          <Button
            type="button"
            size="md"
            className="shrink-0 self-end rounded-lg px-3"
            onClick={() => void handleSend()}
            disabled={streaming || !input.trim()}
            aria-label="Send message"
          >
            {streaming ? <Spinner className="h-4 w-4" /> : <Send size={16} aria-hidden />}
          </Button>
        </div>
      </div>
    </div>
  );
}
