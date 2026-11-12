import type { Request, Response } from "express";
import { pool } from "../services/db.js";
import { loginSchema } from "../validators/auth.js";
import { signToken, verifyPassword } from "../services/authService.js";
import { recordAudit } from "../services/auditService.js";
import { HttpError } from "../middleware/errorHandler.js";

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);

  const { rows } = await pool.query("SELECT id, email, password_hash, role FROM users WHERE email = $1", [email]);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await recordAudit(pool, null, "auth.login_failed", "user", null, { email });
    throw new HttpError(401, "invalid email or password");
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  await recordAudit(pool, user.id, "auth.login_succeeded", "user", user.id);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json({ user: req.user });
}
