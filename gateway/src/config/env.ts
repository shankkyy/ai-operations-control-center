import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  // Render's private-service address is host:port with no scheme; Docker Compose
  // already supplies a full http:// URL, so this is a no-op there.
  AI_SERVICE_URL: z.string().default("http://localhost:8000").transform((v) => (/^https?:\/\//.test(v) ? v : `http://${v}`)),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default("8h"),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@aocc.local"),
  SEED_ADMIN_PASSWORD: z.string().default("ChangeMe123!"),
  LLM_PROVIDER: z.string().default("mock"),
  EMBEDDING_PROVIDER: z.string().default("mock"),
  OPENAI_API_KEY: z.string().default(""),
  ANTHROPIC_API_KEY: z.string().default(""),
  // For single-process deploys (e.g. Render's free tier, which has no separate
  // worker service): runs the BullMQ consumer inside the gateway process
  // instead of docker-compose's dedicated `worker` container.
  RUN_WORKER_INLINE: z.string().optional().transform((v) => v === "true"),
});

export const env = schema.parse(process.env);
