export {};

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": {
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
