import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { signToken, requireAuth, AuthedRequest } from "../middleware/auth";
import { User } from "../types";

const router = Router();

// POST /api/auth/register
router.post("/register", (req: Request, res: Response) => {
  return res.status(403).json({ error: "Self-signup is disabled. Contact an admin." });
});

// POST /api/auth/login (mock OAuth/email login)
router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
  return res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req: AuthedRequest, res: Response) => {
  return res.json({ user: req.user });
});

export default router;
