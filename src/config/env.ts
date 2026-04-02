import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1).optional(),
  AIML_API_KEY: z.string().min(1),
  TRIPO_API_KEY: z.string().min(1),
  AGENT_MODEL: z.string().default("gpt-4o-mini"),
  GCS_BUCKET: z.string().min(1).optional(),
  GCS_PROJECT_ID: z.string().min(1).optional(),
  GCS_KEY_FILE: z.string().optional(),
  GCS_PUBLIC_BASE_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(5),
  JWT_REFRESH_SECRET: z.string().min(5),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Missing env vars:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
