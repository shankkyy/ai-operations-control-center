import { Router } from "express";
import multer from "multer";
import { getDocument, listDocuments, uploadDocument } from "../controllers/documentsController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const documentsRouter = Router();

documentsRouter.get("/documents", requireAuth, asyncHandler(listDocuments));
documentsRouter.get("/documents/:id", requireAuth, asyncHandler(getDocument));
documentsRouter.post(
  "/documents",
  requireAuth,
  requireRole("admin", "operator"),
  upload.single("file"),
  asyncHandler(uploadDocument)
);
