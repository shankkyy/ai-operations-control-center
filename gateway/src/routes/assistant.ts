import { Router } from "express";
import { ask, getConversation } from "../controllers/assistantController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const assistantRouter = Router();

assistantRouter.post("/assistant/ask", requireAuth, asyncHandler(ask));
assistantRouter.get("/conversations/:id", requireAuth, asyncHandler(getConversation));
