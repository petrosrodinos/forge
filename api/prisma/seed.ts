import "dotenv/config";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const SEED_USER_EMAIL = "";
const SEED_USER_PASSWORD = "";
const SEED_USER_ROLE = "ADMIN";

function readFiguresJson(): any[] {
  const figuresPath = path.resolve(__dirname, "../assets/figures/figures.json");
  return JSON.parse(fs.readFileSync(figuresPath, "utf8"));
}

async function ensureSeedUser() {
  const existing = await prisma.user.findUnique({
    where: { email: SEED_USER_EMAIL },
  });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 10);
  return prisma.user.create({
    data: {
      email: SEED_USER_EMAIL,
      passwordHash,
      displayName: "Figures seed",
      role: SEED_USER_ROLE,
    },
  });
}

async function upsertSkinVariant(
  skinId: string,
  variant: string,
  vData: unknown,
) {
  const ip = (vData as { imagePrompt?: Record<string, unknown> } | null)
    ?.imagePrompt;
  if (!ip) return;

  const prompt =
    typeof ip.prompt === "string" ? ip.prompt : null;
  const negativePrompt =
    typeof ip.negativePrompt === "string" ? ip.negativePrompt : null;
  const imageModel =
    typeof ip.model === "string" ? ip.model : null;

  await prisma.skinVariant.upsert({
    where: {
      skinId_variant: { skinId, variant },
    },
    create: {
      skinId,
      variant,
      prompt,
      negativePrompt,
      imageModel,
    },
    update: {
      prompt,
      negativePrompt,
      imageModel,
    },
  });
}

async function main() {
  const figures = readFiguresJson();
  const user = await ensureSeedUser();

  for (const fig of figures) {
    const name = fig.name as string;
    const type = (fig.type as string) ?? "figure";
    const metadata = fig.metadata ?? undefined;

    let figure = await prisma.figure.findFirst({
      where: { userId: user.id, name },
    });
    if (!figure) {
      figure = await prisma.figure.create({
        data: {
          userId: user.id,
          name,
          type,
          metadata,
        },
      });
    } else {
      figure = await prisma.figure.update({
        where: { id: figure.id },
        data: { type, metadata },
      });
    }

    let baseSkin = await prisma.skin.findFirst({
      where: { figureId: figure.id, isBase: true },
    });
    if (!baseSkin) {
      baseSkin = await prisma.skin.create({
        data: {
          figureId: figure.id,
          name: null,
          isBase: true,
        },
      });
    }

    await upsertSkinVariant(baseSkin.id, "A", fig.default?.variantA);
    await upsertSkinVariant(baseSkin.id, "B", fig.default?.variantB);

    for (const sk of fig.skins ?? []) {
      const skinName = sk.name as string;
      let skin = await prisma.skin.findFirst({
        where: { figureId: figure.id, name: skinName, isBase: false },
      });
      if (!skin) {
        skin = await prisma.skin.create({
          data: {
            figureId: figure.id,
            name: skinName,
            isBase: false,
          },
        });
      }

      await upsertSkinVariant(skin.id, "A", sk.variantA);
      await upsertSkinVariant(skin.id, "B", sk.variantB);
    }
  }

  console.log("Seed complete (figures, skins, variants — prompts only).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
