import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { aiServiceHealthy } from "../services/aiServiceClient.js";

export async function getSettings(_req: Request, res: Response): Promise<void> {
  res.json({
    llmProvider: env.LLM_PROVIDER,
    embeddingProvider: env.EMBEDDING_PROVIDER,
    openaiKeyConfigured: env.OPENAI_API_KEY.length > 0,
    anthropicKeyConfigured: env.ANTHROPIC_API_KEY.length > 0,
    aiServiceHealthy: await aiServiceHealthy(),
  });
}
