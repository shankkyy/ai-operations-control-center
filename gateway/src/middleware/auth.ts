import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/authService.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  try {
    req.user = verifyToken(header.slice("Bearer ".length));
    next();
  } catch {
    res.status(401).json({ error: "invalid or expired token" });
  }
}
