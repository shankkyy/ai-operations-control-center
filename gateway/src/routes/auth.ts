import { Router } from "express";
import { login, me } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();

authRouter.post("/auth/login", asyncHandler(login));
authRouter.get("/auth/me", requireAuth, asyncHandler(me));
