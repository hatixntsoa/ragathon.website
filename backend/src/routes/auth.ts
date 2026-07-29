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
import { logAction } from "../logger";

router.post("/login", (req: Request, res: Response) => {
  const body = req.body as { email?: string; username?: string; password?: string };
  const password = body.password;
  // allow login by email or username (name). map 'admin' username to admin@ragathon.local
  let lookupEmail: string | undefined = undefined;
  if (body.email) lookupEmail = body.email;
  else if (body.username) {
    if (body.username === "admin") lookupEmail = "admin@ragathon.local";
    // otherwise try to find user by name
    else {
      const u = db.prepare('SELECT email FROM users WHERE name = ?').get(body.username) as { email?: string } | undefined;
      if (u && u.email) lookupEmail = u.email;
    }
  }

  if (!lookupEmail || !password) {
    return res.status(400).json({ error: "username/email and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(lookupEmail) as User | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logAction("auth.login.failed", { lookup: lookupEmail });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
  logAction("auth.login.success", { userId: user.id, email: user.email });
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
