/** Keep `index.html` meta tags aligned with `LANDING_SEO` for crawlers that do not execute JS. */
export const LANDING_SEO = {
  title: "Forge | AI 3D Game Asset Generator — Characters, Rigs & Batch Pipelines",
  description:
    "Generate AI 3D game assets, meshes, and character rigs in one workflow. AI character generator with prompt enhancement, auto rigging AI, preset animations, skins, variants, and batch creation for Unity, Unreal, and indie teams.",
  keywords: [
    "AI 3D game assets",
    "AI character generator",
    "auto rigging AI",
    "AI game asset generator",
    "generate 3D characters AI",
    "Unity character pipeline",
    "Unreal 3D assets",
    "indie game art",
    "NPC generation",
    "batch 3D assets",
  ].join(", "),
  /** Set to your production URL + /og.png when you ship Open Graph artwork. */
  ogImage: "/favicon.svg",
  ogType: "website" as const,
  siteName: "Forge",
} as const;

export const LANDING_BRAND = "Forge";

export const LANDING_HERO_BADGE = "AI game asset pipeline";

export const LANDING_HERO_TITLE = "AI 3D Game Asset Generator for real-time games";

export const LANDING_HERO_SUBTITLE =
  "Turn prompts and reference images into rigged characters, preset animations, and export-ready meshes—built for indie studios, Unity and Unreal teams, modders, and 3D artists who need volume without losing quality.";

export const LANDING_CTA_PRIMARY = "Generate assets now";

export const LANDING_CTA_SECONDARY = "See examples";

export const LANDING_SIGN_IN_PROMPT = "Already have an account?";

export const LANDING_SIGN_IN_LINK = "Sign in";

export const LANDING_NAV_DASHBOARD = "Dashboard";

export const LANDING_NAV_ANCHORS = [
  { href: "#features", label: "Features" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#how-it-works", label: "How it works" },
] as const;

export const LANDING_VISUAL_CAPTION = "Image → mesh → rig → animate";

export const LANDING_FOOTER_TAGLINE =
  "AI 3D game assets, auto rigging, and batch-ready exports—dark-mode native workspace for shipping characters faster.";

export const LANDING_FEATURE_SECTIONS = [
  {
    id: "feature-ai",
    title: "AI creation",
    subtitle: "Faster ideation for AI 3D game assets without bouncing between disconnected tools.",
    items: [
      {
        title: "AI image generation for game assets",
        body: "Block in silhouettes, materials, and read direction early so your team approves look-and-feel before you commit topology time.",
        keywords: "concept art, texture direction, AI game asset generator",
      },
      {
        title: "AI prompt enhancement",
        body: "Tighten vague briefs into engine-ready descriptors—fewer back-and-forth passes and more consistent results across characters and props.",
        keywords: "prompt refinement, spec clarity, iteration speed",
      },
    ],
  },
  {
    id: "feature-3d",
    title: "3D character pipeline",
    subtitle: "Generate 3D characters AI teams can actually drop into a level and test.",
    items: [
      {
        title: "3D mesh from images and prompts",
        body: "Move from flat references or text to inspectable geometry you can light, measure, and hand off—built for realtime budgets, not just portfolio stills.",
        keywords: "mesh generation, image to 3D, GLB-ready output",
      },
      {
        title: "Multiple figures in one project",
        body: "Keep heroes, enemies, and NPC variants together so naming, scale, and style stay coherent across your roster.",
        keywords: "roster management, consistent scale, art direction",
      },
    ],
  },
  {
    id: "feature-animation",
    title: "Animation & rigging",
    subtitle: "Auto rigging AI that gets characters moving without a manual retargeting marathon.",
    items: [
      {
        title: "Auto rigging for characters",
        body: "Ship testable skeletons sooner—iterate gameplay and camera work while the mesh is still flexible, not after weeks of manual skinning.",
        keywords: "auto rigging AI, skinning, skeletal mesh",
      },
      {
        title: "Preset animations",
        body: "Drop in locomotion and gesture libraries to validate feel in-engine before you commission bespoke mocap or hand keys.",
        keywords: "locomotion sets, prototyping animations, engine preview",
      },
    ],
  },
  {
    id: "feature-variants",
    title: "Variants & batch generation",
    subtitle: "Scale content for live games, mobile skins, and seasonal drops.",
    items: [
      {
        title: "Skins and variants",
        body: "Spin alternate materials, factions, and costume layers from a single base so monetization and mod workflows stay maintainable.",
        keywords: "character variants, cosmetic pipelines, reskins",
      },
      {
        title: "Batch asset creation",
        body: "Queue consistent passes for NPC squads, prop kits, and jam deadlines—same rules, less copy-paste labor across your AI 3D game assets.",
        keywords: "batch 3D assets, NPC generation, production throughput",
      },
    ],
  },
] as const;

export const LANDING_USE_CASES = [
  {
    title: "Indie game characters",
    body: "Ship a readable hero and enemy set without hiring a full character team on day one.",
  },
  {
    title: "NPC generation",
    body: "Populate towns and patrol routes with distinct silhouettes that still share one technical profile.",
  },
  {
    title: "Mobile game skins",
    body: "Produce cosmetic variants fast enough to match live-ops calendars and A/B storefront tests.",
  },
  {
    title: "Prototyping",
    body: "Drop rigged placeholders into greybox levels to test cameras, abilities, and encounter pacing early.",
  },
  {
    title: "Game jam assets",
    body: "Compress ideation-to-playable time with prompt-first workflows when the clock is the boss fight.",
  },
] as const;

export const LANDING_HOW_IT_WORKS = [
  {
    title: "Describe your character",
    body: "Start from a short brief or reference image—call out role, era, silhouette, and any hard constraints for your AI character generator pass.",
  },
  {
    title: "AI enhances the prompt",
    body: "Forge expands weak prompts into structured direction so downstream steps stay on-model and on-style.",
  },
  {
    title: "Generate the 3D mesh",
    body: "Review geometry, scale, and silhouette in context before you commit to polish or engine import.",
  },
  {
    title: "Auto rig & animate",
    body: "Apply auto rigging AI, attach preset animations, and export when the loop feels right in your target engine.",
  },
] as const;


export const LANDING_MID_CTA = {
  title: "Ready to generate 3D characters AI can iterate with your team?",
  body: "Create an account, run a batch pass, and export when your art and engineering leads sign off.",
  primary: "Generate assets now",
  secondary: "View pricing",
} as const;

export const LANDING_STICKY_CTA = {
  label: "Generate assets now",
  dismissLabel: "Dismiss call to action",
} as const;
