import { Router } from "express";
import { readFigures, writeFigures } from "../lib/figures";
import { getAiml } from "../services";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    res.json(await readFigures());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/:name", async (req, res) => {
  try {
    const figures = await readFigures();
    const figure = figures.find((f) => f.name === decodeURIComponent(req.params.name));
    if (!figure) return res.status(404).json({ error: "Figure not found" });
    res.json(figure);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/", async (req, res) => {
  try {
    const figures = await readFigures();
    const figure = req.body;
    if (!figure?.name) return res.status(400).json({ error: "name is required" });
    if (figures.some((f: any) => f.name === figure.name))
      return res.status(409).json({ error: `Figure "${figure.name}" already exists` });
    figures.push(figure);
    await writeFigures(figures);
    res.status(201).json(figure);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.put("/:name", async (req, res) => {
  try {
    const figures = await readFigures();
    const name = decodeURIComponent(req.params.name);
    const idx = figures.findIndex((f: any) => f.name === name);
    if (idx === -1) return res.status(404).json({ error: "Figure not found" });
    figures[idx] = req.body;
    await writeFigures(figures);
    res.json(figures[idx]);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/ai-variant", async (req, res) => {
  try {
    const { description, variant, context = {}, availableModels = [] } = req.body as {
      description: string;
      variant: "A" | "B";
      context: Record<string, any>;
      availableModels: { id: string }[];
    };

    if (variant !== "A" && variant !== "B") return res.status(400).json({ error: "variant must be A or B" });

    const modelList = availableModels.length > 0
      ? availableModels.map((m) => m.id).join(", ")
      : "flux/schnell, flux/dev, dall-e-3";

    const isLight = variant === "A";
    const variantLabel = isLight
      ? "Variant A — Player 1 (Light): warm palette — gold, bronze, ivory, amber, cream, sunlit tones"
      : "Variant B — Player 2 (Dark): cool palette — obsidian, dark iron, midnight blue, slate, charcoal, cold tones";

    const ctxLines: string[] = [
      `SUBJECT: ${context.figureName ?? "unknown"} (${context.figureType ?? "figure"})`,
      `VARIANT: ${variantLabel}`,
    ];
    if (context.skinName)             ctxLines.push(`SKIN NAME: ${context.skinName}`);
    if (context.existingModel)        ctxLines.push(`CURRENT MODEL: ${context.existingModel}`);
    if (context.existingPrompt)       ctxLines.push(`CURRENT PROMPT: ${context.existingPrompt}`);
    if (context.existingNegPrompt)    ctxLines.push(`CURRENT NEGATIVE PROMPT: ${context.existingNegPrompt}`);
    if (context.otherVariantPrompt)   ctxLines.push(`OTHER VARIANT PROMPT (reference): ${context.otherVariantPrompt}`);

    const systemPrompt = `You are an expert at writing image generation prompts for 3D board game miniature creation.
Your prompts will be fed into an image generation model, and the resulting image is processed by Tripo AI into an animated 3D game piece.

CONTEXT:
${ctxLines.join("\n")}

PROMPT RULES — apply to every prompt you write:
- Single isolated subject centred on a PURE WHITE background, no cast shadows, no scenery
- Isometric 3/4 front view or straight front-facing, nothing cropped
- Style: highly detailed miniature figurine, product photography, 3D render
- Clear, clean silhouette — the shape must read well for mesh generation
- If a current prompt exists, improve or adapt it; do not ignore it entirely

AVAILABLE IMAGE MODELS: ${modelList}
Pick the most suitable model. Default to flux/schnell unless you have a specific reason.

OUTPUT — valid JSON only, no markdown fences, no extra text:
{ "model": "...", "prompt": "...", "negativePrompt": "..." }`;

    const lines: string[] = [description?.trim() ? `Requested: ${description.trim()}` : "Generate the best prompt based on the context above."];

    const completion = await getAiml().chatCompletion({
      model: process.env.AGENT_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: lines.join("\n") },
      ],
      max_tokens: 800,
      temperature: 0.75,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    res.json(JSON.parse(cleaned));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.delete("/:name", async (req, res) => {
  try {
    const figures = await readFigures();
    const name = decodeURIComponent(req.params.name);
    const idx = figures.findIndex((f: any) => f.name === name);
    if (idx === -1) return res.status(404).json({ error: "Figure not found" });
    const [deleted] = figures.splice(idx, 1);
    await writeFigures(figures);
    res.json(deleted);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
