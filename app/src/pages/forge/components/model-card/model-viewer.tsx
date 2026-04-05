import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

interface ModelViewerProps {
  src: string;
  animationName?: string;
  className?: string;
}

type ModelViewerPlayback = HTMLElement & {
  play: () => Promise<void>;
  pause: () => void;
  paused: boolean;
};

function asPlayback(el: HTMLElement | null): ModelViewerPlayback | null {
  if (!el) return null;
  const o = el as unknown as { play?: unknown; pause?: unknown; paused?: boolean };
  if (typeof o.play !== "function" || typeof o.pause !== "function") return null;
  return el as ModelViewerPlayback;
}

async function ensureModelViewerDefined(): Promise<void> {
  await import("@google/model-viewer");
  await customElements.whenDefined("model-viewer");
}

export function ModelViewer({ src, animationName, className }: ModelViewerProps) {
  const viewerRef = useRef<HTMLElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const getPlayback = useCallback((): ModelViewerPlayback | null => {
    return asPlayback(viewerRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void ensureModelViewerDefined().then(() => {
      if (cancelled) return;
      const el = getPlayback();
      if (el) {
        try {
          el.pause();
        } catch {
          /* ignore */
        }
      }
      setPlaying(false);
    });
    return () => {
      cancelled = true;
    };
  }, [src, animationName, getPlayback]);

  const togglePlayback = useCallback(async () => {
    if (!animationName) return;
    await ensureModelViewerDefined();
    const el = getPlayback();
    if (!el) return;
    try {
      if (el.paused) {
        await el.play();
        setPlaying(true);
      } else {
        el.pause();
        setPlaying(false);
      }
    } catch {
      setPlaying(false);
    }
  }, [animationName, getPlayback]);

  const showControls = Boolean(animationName);

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-lg", className)}>
      <model-viewer
        ref={viewerRef}
        src={src}
        auto-rotate=""
        camera-controls=""
        shadow-intensity="1"
        animation-name={animationName}
        className="w-full h-[360px] bg-panel"
      />
      {showControls ? (
        <div className="flex justify-center px-2 py-2 bg-surface/70 border-t border-border/60">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-[0.65rem]"
            onClick={() => void togglePlayback()}
          >
            {playing ? <Pause size={12} aria-hidden /> : <Play size={12} aria-hidden />}
            {playing ? "Pause" : "Play"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
