import { z } from "zod";

export const askSchema = z.object({
  question: z.string().min(1).max(2000),
  conversation_id: z.string().uuid().optional(),
  top_k: z.number().int().min(1).max(20).optional(),
  filters: z.record(z.string(), z.unknown()).default({}),
});
