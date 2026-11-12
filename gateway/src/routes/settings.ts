import { Router } from "express";
import { getSettings } from "../controllers/settingsController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const settingsRouter = Router();

settingsRouter.get("/settings", requireAuth, asyncHandler(getSettings));
