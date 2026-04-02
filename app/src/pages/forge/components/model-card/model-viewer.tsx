import { useEffect } from "react";

interface ModelViewerProps {
  src: string;
  animationName?: string;
}

export function ModelViewer({ src, animationName }: ModelViewerProps) {
  useEffect(() => {
    import("@google/model-viewer").catch(() => {});
  }, []);

  return (
    <model-viewer
      src={src}
      auto-rotate=""
      camera-controls=""
      shadow-intensity="1"
      animation-name={animationName}
      className="w-full h-[360px] rounded-lg bg-panel"
    />
  );
}
