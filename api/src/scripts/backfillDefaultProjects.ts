import "dotenv/config";
import { prisma } from "../integrations/db/client";

const DEFAULT_PROJECT_NAME = "Default Project";

async function backfillUser(userId: string) {
  const existing = await prisma.project.findFirst({
    where: { userId, name: DEFAULT_PROJECT_NAME },
  });
  if (existing) {
    const figures = await prisma.figure.findMany({
      where: { userId },
      select: { id: true, projectIds: true },
    });
    const missing = figures.filter((f) => !f.projectIds.includes(existing.id));
    if (missing.length === 0) {
      return { userId, projectId: existing.id, created: false, linked: 0 };
    }
    await prisma.project.update({
      where: { id: existing.id },
      data: {
        figures: { connect: missing.map((f) => ({ id: f.id })) },
      },
    });
    return { userId, projectId: existing.id, created: false, linked: missing.length };
  }

  const figures = await prisma.figure.findMany({
    where: { userId },
    select: { id: true },
  });

  const project = await prisma.project.create({
    data: {
      userId,
      name: DEFAULT_PROJECT_NAME,
      figures: figures.length > 0 ? { connect: figures.map((f) => ({ id: f.id })) } : undefined,
    },
  });

  return { userId, projectId: project.id, created: true, linked: figures.length };
}

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`Backfilling Default Project for ${users.length} user(s)…`);

  let created = 0;
  let linked = 0;

  for (const user of users) {
    const result = await backfillUser(user.id);
    if (result.created) created += 1;
    linked += result.linked;
    console.log(
      `  ${user.email}: project=${result.projectId} created=${result.created} linked=${result.linked}`,
    );
  }

  console.log(`Done. projectsCreated=${created} figuresLinked=${linked}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
