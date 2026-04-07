/** Keep `index.html` meta tags aligned with `LANDING_SEO` for crawlers that do not execute JS. */
export const LANDING_SEO = {
  title: "Forge | AI 3D Game Asset Generator — Characters, Rigs & Batch Workflows",
  description:
    "Generate AI 3D game assets, meshes, and character rigs in one workflow. AI character generator with prompt enhancement, auto rigging AI, preset animations, skins, variants, and batch creation for Unity, Unreal, and indie teams.",
  keywords: [
    "AI 3D game assets",
    "AI character generator",
    "auto rigging AI",
    "AI game asset generator",
    "generate 3D characters AI",
    "Unity 3D characters",
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

export const LANDING_HERO_BADGE = "AI game asset studio";

export const LANDING_HERO_TITLE = "AI 3D Game Asset Studio for real-time games";

export const LANDING_HERO_SUBTITLE =
  "Turn prompts or images into rigged characters, preset animations, and export-ready meshes—built for indie studios, Unity and Unreal teams, modders, and 3D artists who need volume without losing quality.";

export const LANDING_CTA_PRIMARY = "Generate assets now";

export const LANDING_SIGN_IN_PROMPT = "Already have an account?";

export const LANDING_SIGN_IN_LINK = "Sign in";

export const LANDING_NAV_DASHBOARD = "Dashboard";

/** Navbar "Pricing" → full rates page, scrolled to token packs (id `token-packs` on `/pricing`). */
export const PRICING_NAV_PATH = "/pricing#token-packs";

export const LANDING_NAV_ANCHORS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Plans" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#how-it-works", label: "How it works" },
] as const;

export const LANDING_PACKS_TITLE = "Pricing";

export const LANDING_PACKS_SUBTITLE =
  "Pick a pack to start with — create an account and pay securely through Stripe.";

/** Base URL for batch-exported hero GLBs (`app/public/3d-samples/generated-by-figure-type/...`). */
export const LANDING_HERO_GENERATED_GLBS_BASE = "/3d-samples/generated-by-figure-type";

/** One hero tile; omit `url`, or set `""` / `null`, to hide that generation in the landing grid. */
export type LandingHeroGlbSlot = {
  generationIndex: number;
  url?: string | null;
};

/**
 * GLB paths per forge figure type, matching batch output: `{type}/generation {n}/mesh.glb`.
 * Align `value` keys with `FIGURE_TYPES` in `figure-list/index.tsx`.
 */
export const LANDING_HERO_GENERATED_GLBS_BY_TYPE = [
  { value: "creature", label: "Creature" },
  { value: "npc", label: "NPC" },
  { value: "humanoid", label: "Humanoid" },
  { value: "obstacle", label: "Obstacle" },
  { value: "weapon", label: "Weapon" },
  // { value: "armor", label: "Armor" },
  { value: "vehicle", label: "Vehicle" },
  { value: "mount", label: "Mount" },
  { value: "building", label: "Building" },
  // { value: "environment_prop", label: "Environment Prop" },
  { value: "item", label: "Item / Collectible" },
  { value: "projectile", label: "Projectile" },
  { value: "effect", label: "Effect" },
].map(({ value, label }) => {
  const generations = [1, 2, 3] as const;
  return {
    type: value,
    label,
    glbs: generations.map(
      (generationIndex): LandingHeroGlbSlot => ({
        generationIndex,
        /** Absolute path from site root (Vite `public/`). */
        url: `${LANDING_HERO_GENERATED_GLBS_BASE}/${value}/${encodeURIComponent(`generation ${generationIndex}`)}/mesh.glb`,
      }),
    ),
  };
});

/**
 * Lookup: figure type → `{ label, glbs: [{ generationIndex, url }] }`.
 * Same data as `LANDING_HERO_GENERATED_GLBS_BY_TYPE`, keyed by `type` for quick access.
 */
export const LANDING_HERO_GENERATED_GLBS_MAP = Object.fromEntries(
  LANDING_HERO_GENERATED_GLBS_BY_TYPE.map((entry) => [entry.type, { label: entry.label, glbs: entry.glbs }]),
) as Record<
  (typeof LANDING_HERO_GENERATED_GLBS_BY_TYPE)[number]["type"],
  { label: string; glbs: LandingHeroGlbSlot[] }
>;

/** Static GLB files in `app/public/3d-samples` (served at `/3d-samples/...`). */
export const LANDING_3D_SAMPLES = [
  {
    src: "/3d-samples/model-69d23cab.glb",
    title: "Hero showcase — dynamic combat pose",
    description:
      "Full-color ancient warrior with weapons and PBR materials, staged like a collectible miniature under dramatic studio lighting.",
    prompt:
      "Highly detailed ancient warrior figurine, full body, dynamic fighting stance, multiple weapons (bronze sword, iron spear, round shield, dagger), fully colored and textured, realistic painted materials, bronze armor with aged patina, deep red cloth tunic, dark brown leather straps, weathered steel blade, gold trim accents, painted shield emblem, dust and battle wear, muscular anatomy, stylized for 3D game asset, PBR textures, albedo colors, roughness variation, metallic highlights, high-resolution sculpt, clean silhouette, neutral studio background, dramatic lighting, ultra detailed, 4k, game-ready character concept, collectible miniature style",
  },
  {
    src: "/3d-samples/model-69d23de7.glb",
    title: "Rig-prep view — landmarks and clean framing",
    description:
      "Same character in a neutral, front-facing pose on a plain background so rig joints and proportions read clearly before animation.",
    prompt:
      "Highly detailed ancient warrior figurine in dark mode, full body, neutral pose, front-facing camera, visible rig landmarks including articulated joints, full subject framing from head to feet, plain background, single subject only, dynamic fighting stance with multiple weapons (bronze sword, iron spear, round shield, dagger), fully colored and textured, realistic painted materials, bronze armor with aged patina, deep red cloth tunic, dark brown leather straps, weathered steel blade, gold trim accents, painted shield emblem, dust and battle wear, muscular anatomy, stylized for 3D game asset, PBR textures, albedo colors, roughness variation, metallic highlights, high-resolution sculpt, clean silhouette, dramatic lighting, ultra detailed, 4k, game-ready character concept, collectible miniature style",
  },
] as const;


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
    title: "3D character workflow",
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
        keywords: "character variants, cosmetic layers, reskins",
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
  title: "Ready to build 3D characters for your game?",
  body: "Create a free account, describe your character in plain language or upload a reference image, then preview meshes, rigs, and animations in the studio. Adjust prompts until it looks right, and export when you are ready to drop it into your engine.",
  primary: "Generate assets now",
  secondary: "View pricing",
} as const;

export const LANDING_STICKY_CTA = {
  label: "Generate assets now",
  dismissLabel: "Dismiss call to action",
} as const;
