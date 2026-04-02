import { prisma } from "../../db/client";
import type { CreateFigureInput, UpdateFigureInput } from "./figures.types";
import { agentModel, getAiml } from "../../services";
import * as skinImageSvc from "../skin-images/skin-images.service";

function isObjectIdLike(value: string) {
  // Prisma's `@db.ObjectId` fields expect a 24-hex string.
  return /^[a-fA-F0-9]{24}$/.test(value);
}

function applyNegativePrompt(prompt: string, negativePrompt?: string | null): string {
  const p = prompt.trim();
  const neg = negativePrompt?.trim();
  if (!neg) return p;
  // AIML's image generation API in this repo does not accept a dedicated negativePrompt field.
  // We encode it in the prompt text so models that support "negative prompt" semantics can use it.
  return `${p}\n\nNegative prompt: ${neg}`;
}

function safeParseJsonObject(raw: string): unknown {
  // Some models wrap JSON in code fences; try to extract the outer object.
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // Fallback: try to grab the first top-level {...} block.
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    return null;
  }
}

export async function listFigures() {
  return prisma.figure.findMany({
    include: {
      skins: {
        include: {
          variants: {
            include: {
              images: {
                orderBy: { createdAt: "desc" },
                include: {
                  models: {
                    include: { animations: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { isBase: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFigureById(id: string) {
  if (isObjectIdLike(id)) {
    return prisma.figure.findUnique({
      where: { id },
      include: {
        skins: {
          include: {
            variants: {
              include: {
                images: {
                  include: { models: { include: { animations: true } } },
                },
              },
            },
          },
        },
      },
    });
  }

  return prisma.figure.findFirst({
    where: { name: id },
    include: {
      skins: {
        include: {
          variants: {
            include: {
              images: {
                include: { models: { include: { animations: true } } },
              },
            },
          },
        },
      },
    },
  });
}

export async function createFigure(input: CreateFigureInput) {
  return prisma.figure.create({
    data: { name: input.name, type: input.type, metadata: input.metadata as never },
  });
}

export async function updateFigure(id: string, input: UpdateFigureInput) {
  const data = {
    name: input.name,
    type: input.type,
    metadata: input.metadata as never,
  };

  if (isObjectIdLike(id)) {
    return prisma.figure.update({ where: { id }, data });
  }

  // Avoid `updateMany` (Prisma needs MongoDB replica set for transactions).
  // Instead, resolve the figure first, then update by its unique `id`.
  const existing = await prisma.figure.findFirst({ where: { name: id } });
  if (!existing) return null;
  return prisma.figure.update({ where: { id: existing.id }, data });
}

export async function deleteFigure(id: string) {
  if (isObjectIdLike(id)) return prisma.figure.delete({ where: { id } });

  const existing = await prisma.figure.findFirst({
    where: { name: id },
    include: {
      skins: {
        include: {
          variants: {
            include: {
              images: {
                include: { models: { include: { animations: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!existing) return null;
  await prisma.figure.delete({ where: { id: existing.id } });
  return existing;
}

interface GenerateFigureImageInput {
  figureId: string;
  skinName?: string | null;
  variant: "A" | "B";
  model?: string;
  prompt: string;
  negativePrompt?: string;
  size?: string;
  steps?: number;
}

export async function generateAndSaveFigureImage(input: GenerateFigureImageInput) {
  const {
    figureId,
    skinName,
    variant,
    model = "flux/schnell",
    prompt,
    negativePrompt,
    size,
    steps,
  } = input;

  const resolvedSkin =
    skinName && skinName.trim()
      ? await prisma.skin.findFirst({ where: { figureId, name: skinName.trim() } })
      : await prisma.skin.findFirst({ where: { figureId, isBase: true } });

  if (!resolvedSkin) {
    throw new Error("Skin not found for figure");
  }

  const variantRecord = await prisma.skinVariant.upsert({
    where: { skinId_variant: { skinId: resolvedSkin.id, variant } },
    update: { imageModel: model, prompt, negativePrompt: negativePrompt ?? null },
    create: {
      skinId: resolvedSkin.id,
      variant,
      imageModel: model,
      prompt,
      negativePrompt: negativePrompt ?? null,
    },
  });

  const finalPrompt = applyNegativePrompt(prompt, negativePrompt);
  const generated = await getAiml().generateImage({
    model,
    prompt: finalPrompt,
    size,
    steps,
  });

  const first = generated.data?.[0];
  const imageUrl =
    first?.url ??
    (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null);

  if (!imageUrl) throw new Error("No image in generation response");

  const savedImage = await skinImageSvc.createSkinImage(
    variantRecord.id,
    figureId,
    imageUrl
  );

  return {
    imageUrl,
    skinId: resolvedSkin.id,
    variantId: variantRecord.id,
    image: savedImage,
  };
}

interface AiVariantContext {
  figureName?: string;
  figureType?: string; // e.g. "figure" | "obstacle"
  skinName?: string;
  existingModel?: string | null;
  existingPrompt?: string | null;
  existingNegPrompt?: string | null;
  otherVariantPrompt?: string | null;
}

interface GenerateAiVariantInput {
  description: string;
  variant: "A" | "B";
  context?: AiVariantContext;
  availableModels?: Array<{ id: string; label?: string }>;
}

const AI_VARIANT_MODEL_PREFERENCE: string[] = [
  // Prefer models that generally do well with structured prompts.
  "flux-pro/v1.1-ultra",
  "flux-pro/v1.1",
  "blackforestlabs/flux-2-max",
  "blackforestlabs/flux-2-pro",
  "flux/schnell",
  "flux/pro",
  "flux/dev",
];

export async function generateAiVariant(input: GenerateAiVariantInput): Promise<{
  model?: string;
  prompt: string;
  negativePrompt: string;
}> {
  const ctx: AiVariantContext = input.context ?? {};
  const figureType = (ctx.figureType ?? "figure").toLowerCase();
  const descriptionLower = input.description.toLowerCase();
  const available = Array.isArray(input.availableModels) ? input.availableModels : [];

  const chosenModel =
    (ctx.existingModel && available.some((m) => m.id === ctx.existingModel) ? ctx.existingModel : undefined) ??
    AI_VARIANT_MODEL_PREFERENCE.find((id) => available.some((m) => m.id === id)) ??
    available[0]?.id ??
    undefined;

  const shouldTreatAsObject =
    figureType !== "figure" ||
    /(robot|mech|vehicle|car|truck|plane|boat|train|droid|android|prop|weapon|tool|machine|gear|gearbox|gun|sword|axe|shield|helmet|chair|table|bench|rock|statue|tree|plant|lamp|robotic|mechanical)/i.test(
      descriptionLower
    );

  const humanRigGuidance = `
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

  const objectRigGuidance = `
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

  const rigGuidance = shouldTreatAsObject ? objectRigGuidance : humanRigGuidance;

  const systemPrompt =
    "You are a senior technical prompt engineer for riggable 3D figure generation from images. " +
    "Given a user description for a figure variant, you must output ONLY JSON with fields: prompt and negativePrompt (and optionally model). " +
    "Your prompt MUST satisfy the strict front-facing + visible rig landmarks requirements (humans OR objects).";

  const userPrompt = `
Variant: ${input.variant}
Figure name: ${ctx.figureName ?? "unknown"}
Figure type: ${ctx.figureType ?? "figure"}
Skin/material: ${ctx.skinName ?? "unspecified"}

User description for the variant:
${input.description}

Context (use to keep anatomy/pose consistent across variants):
Existing prompt (same variant if present): ${ctx.existingPrompt ?? "(none)"}
Existing negative prompt: ${ctx.existingNegPrompt ?? "(none)"}
Other variant prompt (A<->B): ${ctx.otherVariantPrompt ?? "(none)"}

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
${rigGuidance}
`.trim();

  const response = await getAiml().chatCompletion({
    model: agentModel(),
    temperature: 0.2,
    max_tokens: 700,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ai_variant_image_prompt",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            model: { type: "string" },
            prompt: { type: "string", minLength: 1 },
            negativePrompt: { type: "string", minLength: 1 },
          },
          required: ["prompt", "negativePrompt"],
        },
      },
    },
  });

  const content = response.choices?.[0]?.message?.content ?? "";
  const parsed = safeParseJsonObject(content);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI variant generation returned non-JSON output");
  }

  const prompt = (parsed as any).prompt;
  const negativePrompt = (parsed as any).negativePrompt;
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("AI variant generation missing prompt");
  if (typeof negativePrompt !== "string" || !negativePrompt.trim()) {
    throw new Error("AI variant generation missing negativePrompt");
  }

  const modelFromAi = (parsed as any).model;
  const model =
    typeof modelFromAi === "string" && modelFromAi.trim()
      ? modelFromAi.trim()
      : chosenModel;

  return { model, prompt: prompt.trim(), negativePrompt: negativePrompt.trim() };
}
