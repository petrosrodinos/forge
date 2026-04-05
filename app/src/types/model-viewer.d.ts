import type { Ref } from "react";

export {};

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": {
        ref?: Ref<HTMLElement | null>;
        src?: string;
        "auto-rotate"?: string;
        "camera-controls"?: string;
        "shadow-intensity"?: string;
        "animation-name"?: string;
        ar?: string;
        className?: string;
        id?: string;
      };
    }
  }
}
