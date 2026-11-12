import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  AI_SERVICE_URL: z.string().default("http://localhost:8000"),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default("8h"),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@aocc.local"),
  SEED_ADMIN_PASSWORD: z.string().default("ChangeMe123!"),
  LLM_PROVIDER: z.string().default("mock"),
  EMBEDDING_PROVIDER: z.string().default("mock"),
  OPENAI_API_KEY: z.string().default(""),
  ANTHROPIC_API_KEY: z.string().default(""),
});

export const env = schema.parse(process.env);
