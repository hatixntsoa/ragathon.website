import { Router, Response } from "express";
import { db } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { startTimer, pauseTimer, resetTimer, setDuration, computeCurrentState } from "../socket";

const router = Router();

router.use(requireAuth, requireRole("admin"));

// GET /api/admin/timer
router.get("/timer", (_req, res: Response) => {
  return res.json(computeCurrentState());
});

// POST /api/admin/timer/start
router.post("/timer/start", (_req, res: Response) => {
  return res.json(startTimer());
});

// POST /api/admin/timer/pause
router.post("/timer/pause", (_req, res: Response) => {
  return res.json(pauseTimer());
});

// POST /api/admin/timer/reset  { durationMs?: number }
router.post("/timer/reset", (req, res: Response) => {
  const { durationMs } = req.body as { durationMs?: number };
  return res.json(resetTimer(durationMs));
});

// POST /api/admin/timer/duration  { durationMs: number }
router.post("/timer/duration", (req, res: Response) => {
  const { durationMs } = req.body as { durationMs?: number };
  if (!durationMs || durationMs <= 0) {
    return res.status(400).json({ error: "durationMs must be a positive number" });
  }
  return res.json(setDuration(durationMs));
});

// GET /api/admin/users  (list logged-in users + submission history)
router.get("/users", (_req, res: Response) => {
  const users = db
    .prepare(`SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC`)
    .all();

  const submissions = db
    .prepare(
      `SELECT id, user_id, status, score, submitted_at FROM submissions ORDER BY submitted_at DESC`
    )
    .all() as { id: string; user_id: string; status: string; score: number | null; submitted_at: string }[];

  const byUser: Record<string, typeof submissions> = {};
  for (const s of submissions) {
    if (!byUser[s.user_id]) byUser[s.user_id] = [];
    byUser[s.user_id].push(s);
  }

  const result = (users as { id: string }[]).map((u) => ({
    ...u,
    submissions: byUser[u.id] || [],
  }));

  return res.json({ users: result });
});

export default router;
