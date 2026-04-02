export const HUMAN_RIG_GUIDANCE = `
You must write an image prompt that produces a rig-friendly single 3D figure mesh (used for Tripo image->mesh).

STRICT FRONT-FACING REQUIREMENTS (non-negotiable):
1) Camera: straight-on / front view, eye-level, no tilt. Neutral “T-pose” or “A-pose”.
2) Framing: the full body is visible (head to feet). Centered. Not cropped.
3) Symmetry: left/right limbs should be clearly readable and not fused together.
4) Rig landmarks must be visible (show joints clearly):
   - Shoulders, elbows, wrists, hands (separate fingers)
   - Hips/pelvis, knees, ankles, feet (separate toes)
   - Spine/torso outline, neck, head (face visible)
5) No occlusion: arms/legs must not cross in front of the torso; hands/feet must not be hidden.
6) For animation/retargeting: limbs should be separate volumes (not melted together).

ANATOMY DETAIL RULES:
- Prefer plain, fitted clothing or minimal coverings so elbows/knees/wrists/ankles remain visible.
- Avoid hair that covers the face/eyes.
- Avoid accessories/props that obscure joints (bags, capes, large scarves).

ADAPTATION:
- If the description implies an animal/quadruped, still keep it strictly front-facing and ensure front legs/back legs joints are clearly visible (shoulder/elbow/knee/hock/ankle/feet; head/neck; tail base visible).
`.trim();

export const OBJECT_RIG_GUIDANCE = `
You must write an image prompt that produces a rig-friendly single 3D object mesh (used for Tripo image->mesh).

STRICT FRONT-FACING REQUIREMENTS (non-negotiable):
1) Camera: straight-on / front view, eye-level, no tilt.
2) Framing: the full object is visible, centered, and not cropped.
3) Single subject only: one object total (no extra props, no people, no background objects).
4) “Rig landmarks” must be visible as separable articulated parts:
   - Clearly separated segments (not fused into one blob)
   - Visible hinges/axles/knuckles/hinge lines or mechanical joints
   - Clear attach points between parts (e.g., wheel axle to wheel, door hinge to body, arm segments to torso)
   - Any moving part must be distinguishable as its own volume (so animation can rotate/translate it)
5) No occlusion: parts must not hide each other; articulated joints must be visible from the front.
6) For animation/retargeting: parts should have enough spacing/edge separation to avoid “melted” connections.

OBJECT DETAIL RULES:
- Avoid cloth-like drapes, smoke, fog, heavy grime, or textures that blend parts together.
- Avoid multiple objects in a scene; keep background plain.
- Prefer simple, clean mechanical designs with visible geometry edges.

Examples of what counts as “rig landmarks” for objects:
- Robots/mechs: robot head/torso + separate arm segments (upper arm / forearm / hand) with visible joint boundaries.
- Vehicles: wheels as separate volumes with visible axle centers; steering wheel / doors as separable parts.
- Props/tools: clear handle/pivot areas and separated subcomponents (blade/head/guard) instead of an amorphous mass.
`.trim();

export const AI_VARIANT_SYSTEM_PROMPT =
  "You are a senior technical prompt engineer for riggable 3D figure generation from images. " +
  "Given a user description for a figure variant, you must output ONLY JSON with fields: prompt and negativePrompt (and optionally model). " +
  "Your prompt MUST satisfy the strict front-facing + visible rig landmarks requirements (humans OR objects).";

export interface BuildAiVariantUserPromptInput {
  variant: "A" | "B";
  figureName?: string;
  figureType: string;
  skinName?: string;
  description: string;
  existingPrompt?: string | null;
  existingNegPrompt?: string | null;
  otherVariantPrompt?: string | null;
  rigGuidance: string;
}

export function buildAiVariantUserPrompt(input: BuildAiVariantUserPromptInput): string {
  return `
Variant: ${input.variant}
Figure name: ${input.figureName ?? "unknown"}
Figure type: ${input.figureType}
Skin/material: ${input.skinName ?? "unspecified"}

User description for the variant:
${input.description}

Context (use to keep anatomy/pose consistent across variants):
Existing prompt (same variant if present): ${input.existingPrompt ?? "(none)"}
Existing negative prompt: ${input.existingNegPrompt ?? "(none)"}
Other variant prompt (A<->B): ${input.otherVariantPrompt ?? "(none)"}

You must return:
1) prompt: a single concise image prompt that includes:
   - strict front-facing camera
   - neutral pose (humans/animals) OR neutral “assembly view” (objects)
   - full subject framing (head->feet OR full object)
   - explicit visible rig landmarks (human joints OR object hinges/attach points)
   - plain background (no scenery)
   - single subject only (one character OR one object)
2) negativePrompt: a comma-separated list of things to avoid, including:
   - side/back/3-4 view
   - cropped parts
   - occluded joints / hidden hinges
   - fused fingers/hands (humans) / fused segments (objects)
   - fused limbs (humans)
   - multiple characters/objects
   - hair covering face (humans)
   - motion blur / dynamic action poses
   - low quality artifacts

Keep the surface/style changes aligned with the user description, but DO NOT change the rigging-critical anatomy, pose, or camera.

Rig-guidance:
${input.rigGuidance}
`.trim();
}

