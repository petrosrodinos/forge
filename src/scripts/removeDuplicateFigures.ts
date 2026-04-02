import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { MongoClient, type ObjectId } from "mongodb";

function usage() {
  return [
    "Usage:",
    "  npx ts-node src/scripts/removeDuplicateFigures.ts --apply",
    "",
    "By default, the script runs in dry-run mode (no deletions).",
  ].join("\n");
}

function getArgFlag(flag: string) {
  return process.argv.includes(flag);
}

async function main() {
  const apply = getArgFlag("--apply");
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL in env.");

  const uri = process.env.DATABASE_URL;
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    const figures = db.collection("Figure");
    const skins = db.collection("Skin");
    const skinVariants = db.collection("SkinVariant");
    const skinImages = db.collection("SkinImage");
    const model3Ds = db.collection("Model3D");
    const animations = db.collection("Animation");

    // Find duplicate figures by name, keep the newest (updatedAt desc, createdAt desc).
    // Note: MongoDB stores ObjectIds in `:_id` fields as ObjectId objects in JS.
    const dupGroups = await figures
      .aggregate<{
        _id: string;
        count: number;
        keepId: ObjectId;
        removeIds: ObjectId[];
      }>([
        { $match: { name: { $type: "string", $ne: "" } } },
        { $sort: { updatedAt: -1, createdAt: -1, _id: 1 } },
        {
          $group: {
            _id: "$name",
            count: { $sum: 1 },
            keepId: { $first: "$_id" },
            removeIds: { $push: "$_id" },
          },
        },
        {
          $project: {
            count: 1,
            keepId: 1,
            removeIds: {
              $filter: {
                input: "$removeIds",
                as: "id",
                cond: { $ne: ["$$id", "$keepId"] },
              },
            },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    const totalFigures = await figures.countDocuments({});
    const totalDupGroups = dupGroups.length;
    const removeFigureIds = dupGroups.flatMap(g => g.removeIds);
    const keepFigureIds = dupGroups.map(g => g.keepId);

    if (totalDupGroups === 0) {
      console.log("No duplicate figures found by `name` (excluding empty string).");
      return;
    }

    // Compute related subtree IDs to delete.
    const removeSkinDocs = await skins
      .find({ figureId: { $in: removeFigureIds } }, { projection: { _id: 1 } })
      .toArray();
    const removeSkinIds = removeSkinDocs.map(d => d._id as ObjectId);

    const removeSkinVariantDocs = await skinVariants
      .find({ skinId: { $in: removeSkinIds } }, { projection: { _id: 1 } })
      .toArray();
    const removeSkinVariantIds = removeSkinVariantDocs.map(d => d._id as ObjectId);

    const removeSkinImageDocs = await skinImages
      .find({ variantId: { $in: removeSkinVariantIds } }, { projection: { _id: 1 } })
      .toArray();
    const removeSkinImageIds = removeSkinImageDocs.map(d => d._id as ObjectId);

    const removeModel3dDocs = await model3Ds
      .find({ imageId: { $in: removeSkinImageIds } }, { projection: { _id: 1 } })
      .toArray();
    const removeModel3dIds = removeModel3dDocs.map(d => d._id as ObjectId);

    const removeAnimationDocs = await animations
      .find({ model3dId: { $in: removeModel3dIds } }, { projection: { _id: 1 } })
      .toArray();
    const removeAnimationIds = removeAnimationDocs.map(d => d._id as ObjectId);

    const report = {
      generatedAt: new Date().toISOString(),
      apply,
      databaseUrl: uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@"),
      totals: { totalFigures, totalDupGroups },
      figuresByName: dupGroups.map(g => ({
        name: g._id,
        keepId: g.keepId.toHexString(),
        removeIds: g.removeIds.map(id => id.toHexString()),
      })),
      idsToDelete: {
        figures: removeFigureIds.map(id => id.toHexString()),
        skins: removeSkinIds.map(id => id.toHexString()),
        skinVariants: removeSkinVariantIds.map(id => id.toHexString()),
        skinImages: removeSkinImageIds.map(id => id.toHexString()),
        model3Ds: removeModel3dIds.map(id => id.toHexString()),
        animations: removeAnimationIds.map(id => id.toHexString()),
      },
      counts: {
        keepFigures: keepFigureIds.length,
        removeFigures: removeFigureIds.length,
        removeSkins: removeSkinIds.length,
        removeSkinVariants: removeSkinVariantIds.length,
        removeSkinImages: removeSkinImageIds.length,
        removeModel3Ds: removeModel3dIds.length,
        removeAnimations: removeAnimationIds.length,
      },
    };

    const outDir = path.resolve(process.cwd(), "output");
    const outPath = path.join(outDir, `dedupe-figures-${Date.now()}.json`);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

    console.log(`Duplicate figure groups: ${totalDupGroups}`);
    console.log(`Figures to delete: ${removeFigureIds.length}`);
    console.log(`Skins to delete: ${removeSkinIds.length}`);
    console.log(`SkinVariants to delete: ${removeSkinVariantIds.length}`);
    console.log(`SkinImages to delete: ${removeSkinImageIds.length}`);
    console.log(`Model3D to delete: ${removeModel3dIds.length}`);
    console.log(`Animations to delete: ${removeAnimationIds.length}`);
    console.log(`Report written to: ${outPath}`);

    if (!apply) {
      console.log("\nDry-run complete (no deletions). Re-run with `--apply` to actually delete.");
      return;
    }

    // Delete in leaf-to-root order.
    if (removeAnimationIds.length) await animations.deleteMany({ _id: { $in: removeAnimationIds } });
    if (removeModel3dIds.length) await model3Ds.deleteMany({ _id: { $in: removeModel3dIds } });
    if (removeSkinImageIds.length) await skinImages.deleteMany({ _id: { $in: removeSkinImageIds } });
    if (removeSkinVariantIds.length) await skinVariants.deleteMany({ _id: { $in: removeSkinVariantIds } });
    if (removeSkinIds.length) await skins.deleteMany({ _id: { $in: removeSkinIds } });
    if (removeFigureIds.length) await figures.deleteMany({ _id: { $in: removeFigureIds } });

    console.log("\nDeletion complete.");
  } finally {
    await client.close();
  }
}

main().catch(e => {
  console.error(e instanceof Error ? e.message : e);
  console.error(usage());
  process.exit(1);
});

