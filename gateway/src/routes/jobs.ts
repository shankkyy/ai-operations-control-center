import { Router } from "express";
import { listJobs } from "../controllers/jobsController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const jobsRouter = Router();

jobsRouter.get("/jobs", requireAuth, asyncHandler(listJobs));
