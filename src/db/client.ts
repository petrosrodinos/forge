// eslint-disable-next-line @typescript-eslint/no-explicit-any
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };

// Prisma v6: datasource url comes from `schema.prisma` via `env("DATABASE_URL")`.
export const prisma: PrismaClient = g.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") g.prisma = prisma;
