import { useEffect } from "react";
import { useFigures } from "@/features/figures/hooks/use-figures.hooks";
import { useForgeStore } from "@/store/forgeStore";
import { FigureList } from "@/pages/forge/components/figure-list";
import { SkinTabs } from "@/pages/forge/components/skin-tabs";
import { SkinPanel } from "@/pages/forge/components/skin-panel";
import { ChatPanel } from "@/pages/forge/components/chat-panel";
import { PipelineProgress } from "@/pages/forge/components/pipeline-panel/pipeline-progress";
import { ImageGenPanel } from "@/pages/forge/components/image-gen-panel";
import { usePipeline } from "@/features/pipeline/hooks/use-pipeline.hooks";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, jsonInit } from "@/utils/apiClient";

export default function ForgePage() {
  const { data: figures } = useFigures();
  const qc = useQueryClient();
  const {
    activeFigure,
    setActiveFigure,
    activeSkin,
    setActiveSkin,
    rightPanelTab,
  } = useForgeStore();

  const { steps, running, error } = usePipeline(() => {
    qc.invalidateQueries({ queryKey: ["figures"] });
  });

  // Auto-select first figure
  useEffect(() => {
    if (!activeFigure && figures && figures.length > 0) {
      setActiveFigure(figures[0]);
    }
  }, [figures, activeFigure, setActiveFigure]);

  // Auto-select first skin when figure changes
  useEffect(() => {
    if (activeFigure && !activeSkin && activeFigure.skins.length > 0) {
      setActiveSkin(activeFigure.skins[0]);
    }
  }, [activeFigure, activeSkin, setActiveSkin]);

  // Sync active figure from fresh query data
  useEffect(() => {
    if (activeFigure && figures) {
      const fresh = figures.find((f) => f.id === activeFigure.id);
      if (fresh) setActiveFigure(fresh);
    }
  }, [figures]);

  async function handleAddSkin() {
    if (!activeFigure) return;
    await apiFetch(`/api/figures/${activeFigure.id}/skins`, {
      method: "POST",
      ...jsonInit({ name: "New Skin" }),
    });
    qc.invalidateQueries({ queryKey: ["figures"] });
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Figure list */}
      <aside className="w-52 shrink-0 border-r border-border bg-panel overflow-hidden flex flex-col">
        <FigureList />
      </aside>

      {/* Center: Skin editor */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {activeFigure ? (
          <>
            <SkinTabs
              skins={activeFigure.skins}
              onAddSkin={() => void handleAddSkin()}
            />
            <div className="flex-1 overflow-hidden">
              {activeSkin ? (
                <SkinPanel skin={activeSkin} figureId={activeFigure.id} />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-slate-500">
                  Select or add a skin
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Select a figure to start
          </div>
        )}
      </div>

      {/* Right: Mode panel */}
      <aside className="w-80 shrink-0 border-l border-border bg-panel overflow-hidden flex flex-col">
        {rightPanelTab === "chat" && <ChatPanel />}
        {rightPanelTab === "pipeline" && (
          <PipelineProgress
            steps={steps}
            running={running}
            result={null}
            error={error}
          />
        )}
        {rightPanelTab === "imagegen" && <ImageGenPanel />}
      </aside>
    </div>
  );
}
