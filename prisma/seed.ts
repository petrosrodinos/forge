import "dotenv/config";
import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";

type VariantKey = "A" | "B";

function now() {
  return new Date();
}

function maybe<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : value;
}

async function seedVariant(
  skinId: ObjectId,
  variant: VariantKey,
  vData: any,
  cols: any,
) {
  const ip = vData?.imagePrompt;
  if (!ip) return;

  const createdAt = now();

  // SkinVariant has unique([skinId, variant]); mirror the Prisma upsert behavior.
  const skinVariantFilter = { skinId, variant };
  const skinVariantInsert = {
    _id: new ObjectId(),
    skinId,
    variant,
    prompt: maybe(ip.prompt),
    negativePrompt: maybe(ip.negativePrompt),
    imageModel: maybe(ip.model),
    createdAt,
    updatedAt: createdAt,
  };

  await cols.skinVariants.updateOne(skinVariantFilter, { $setOnInsert: skinVariantInsert }, { upsert: true });
  const sv = await cols.skinVariants.findOne(skinVariantFilter);
  if (!sv?._id) throw new Error("Failed to resolve SkinVariant _id after upsert");

  for (const imgObj of ip.images ?? []) {
    const siDoc = {
      _id: new ObjectId(),
      variantId: sv._id,
      sourceUrl: imgObj.url,
      gcsUrl: null,
      createdAt: now(),
    };
    await cols.skinImages.insertOne(siDoc);

    for (const m of imgObj.models3d ?? []) {
      const m3Doc = {
        _id: new ObjectId(),
        imageId: siDoc._id,
        status: m.status ?? "failed",
        error: m.error ?? null,
        meshTaskId: m.meshTaskId ?? null,
        prerigTaskId: m.prerigTaskId ?? null,
        rigTaskId: m.rigTaskId ?? null,
        pbrModelSourceUrl: m.pbrModelUrl ?? null,
        modelSourceUrl: m.modelUrl ?? null,
        createdAt: now(),
        updatedAt: now(),
      };
      await cols.model3Ds.insertOne(m3Doc);

      for (const anim of m.animations ?? []) {
        const animDoc = {
          _id: new ObjectId(),
          model3dId: m3Doc._id,
          animationKey: anim.animationKey,
          retargetTaskId: anim.retargetTaskId ?? null,
          glbSourceUrl: anim.glbUrl ?? null,
          gcsGlbUrl: null,
          gcsGlbKey: null,
          status: anim.status ?? "success",
          error: null,
          createdAt: now(),
          updatedAt: now(),
        };
        await cols.animations.insertOne(animDoc);
      }
    }
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Missing DATABASE_URL in env.");

  const figuresPath = path.resolve(__dirname, "../assets/figures/figures.json");
  const figures: any[] = JSON.parse(fs.readFileSync(figuresPath, "utf8"));

  const client = new MongoClient(databaseUrl);
  await client.connect();
  try {
    const db = client.db();
    const cols = {
      figures: db.collection("Figure"),
      skins: db.collection("Skin"),
      skinVariants: db.collection("SkinVariant"),
      skinImages: db.collection("SkinImage"),
      model3Ds: db.collection("Model3D"),
      animations: db.collection("Animation"),
    };

    for (const fig of figures) {
      const figureId = new ObjectId();
      await cols.figures.insertOne({
        _id: figureId,
        name: fig.name,
        type: fig.type ?? "figure",
        metadata: fig.metadata ?? undefined,
        createdAt: now(),
        updatedAt: now(),
      });

      const baseSkinId = new ObjectId();
      await cols.skins.insertOne({
        _id: baseSkinId,
        figureId,
        name: null,
        isBase: true,
        createdAt: now(),
        updatedAt: now(),
      });

      await seedVariant(baseSkinId, "A", fig.default?.variantA, cols);
      await seedVariant(baseSkinId, "B", fig.default?.variantB, cols);

      for (const sk of fig.skins ?? []) {
        const skinId = new ObjectId();
        await cols.skins.insertOne({
          _id: skinId,
          figureId,
          name: sk.name,
          isBase: false,
          createdAt: now(),
          updatedAt: now(),
        });

        await seedVariant(skinId, "A", sk.variantA, cols);
        await seedVariant(skinId, "B", sk.variantB, cols);
      }
    }

    console.log("Seed complete (Mongo native).");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
