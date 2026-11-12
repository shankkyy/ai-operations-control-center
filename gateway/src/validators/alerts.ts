import { z } from "zod";

export const patchAlertSchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved"]),
});
