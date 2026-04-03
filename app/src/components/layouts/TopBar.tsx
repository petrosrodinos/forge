import { LogOut, Coins, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/use-auth.hooks";
import { useForgeStore } from "@/store/forgeStore";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";

export function TopBar() {
  const { user, logout } = useAuth();
  const { chatPanelOpen, setChatPanelOpen, figurePanelOpen, setFigurePanelOpen } = useForgeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isForge = location.pathname === "/forge";

  function handleForgeClick() {
    if (!isForge) {
      navigate("/forge");
    } else {
      setChatPanelOpen(!chatPanelOpen);
    }
  }

  return (
    <header className="h-12 flex items-center gap-4 px-4 border-b border-border bg-panel shrink-0">
      {isForge && (
        <button
          onClick={() => setFigurePanelOpen(!figurePanelOpen)}
          className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Toggle figures panel"
        >
          <Menu size={16} />
        </button>
      )}
      <span className="text-sm font-semibold text-accent-light mr-2">3D Figures</span>

      <nav className="flex items-center gap-1">
        <button
          onClick={handleForgeClick}
          className={cn(
            "text-xs px-3 py-1.5 rounded transition-colors border",
            isForge ? "active-mode-btn" : "border-transparent text-slate-400 hover:text-slate-200",
          )}
        >
          Forge
        </button>
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {user && (
          <>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Coins size={12} />
              {user.tokenBalance}
            </span>
            <a href="/billing" className="hidden sm:inline text-xs text-accent-light hover:underline">
              Buy tokens
            </a>
            <span className="hidden sm:inline text-xs text-slate-400">{user.displayName ?? user.email}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="p-1">
              <LogOut size={14} />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
