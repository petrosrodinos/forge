import { LogOut, Coins } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";

export function TopBar() {
  const { user, logout } = useAuth();
  const { rightPanelTab, setRightPanelTab } = useForgeStore();

  const tabs: Array<{ id: "chat" | "pipeline" | "imagegen"; label: string }> = [
    { id: "chat", label: "Chat" },
    { id: "pipeline", label: "Pipeline" },
    { id: "imagegen", label: "Image Gen" },
  ];

  return (
    <header className="h-12 flex items-center gap-4 px-4 border-b border-border bg-panel shrink-0">
      <span className="text-sm font-semibold text-accent-light mr-2">3D Figures</span>

      <nav className="flex items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setRightPanelTab(t.id)}
            className={cn(
              "text-xs px-3 py-1.5 rounded transition-colors border",
              rightPanelTab === t.id
                ? "active-mode-btn"
                : "border-transparent text-slate-400 hover:text-slate-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {user && (
          <>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Coins size={12} />
              {user.tokenBalance}
            </span>
            <a href="/billing" className="text-xs text-accent-light hover:underline">
              Buy tokens
            </a>
            <span className="text-xs text-slate-400">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="p-1">
              <LogOut size={14} />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
