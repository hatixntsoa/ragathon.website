import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { runEvaluation, getMaxSubmissions } from "./evaluation";
import { computeCurrentState } from "../socket";

const router = Router();

const UPLOAD_DIR = path.join(__dirname, "..", "..", "data", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Accept JSON responses from the customized RAG system (per new spec)
    const allowed = [".json"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only .json files are accepted"));
    }
  },
});

// POST /api/submissions  (multipart: model)
router.post(
  "/",
  requireAuth,
  upload.fields([{ name: "model", maxCount: 1 }]),
  (req: AuthedRequest, res: Response) => {
    if (req.user!.role !== "user") {
      return res.status(403).json({ error: "Admin accounts cannot submit models" });
    }

    const timerState = computeCurrentState();
    if (timerState.status !== "running") {
      return res.status(403).json({ error: "submissions_closed" });
    }

    const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
    const modelFile = files?.model?.[0];

    if (!modelFile) {
      return res.status(400).json({ error: "response.json is required" });
    }

    const id = uuidv4();
    const userId = req.user!.sub;
    const currentCount = (db.prepare("SELECT COUNT(*) AS c FROM submissions WHERE user_id = ?").get(userId) as { c: number }).c;
    if (currentCount >= getMaxSubmissions()) {
      return res.status(429).json({ error: "submission_limit_reached", remaining: 0 });
    }

    db.prepare(
      `INSERT INTO submissions (id, user_id, model_filename, notebook_filename, status)
       VALUES (?, ?, ?, ?, 'pending')`
    ).run(id, userId, modelFile.filename, "");

    // Log submission and queue evaluation asynchronously so the request returns immediately.
    import("../logger").then(({ logAction }) => logAction("submission.created", { submissionId: id, userId }));
    setImmediate(() => runEvaluation(id));

    return res.status(201).json({ submissionId: id, status: "pending", remaining: getMaxSubmissions() - currentCount - 1 });
  }
);

// GET /api/submissions/mine
router.get("/mine", requireAuth, (req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare(
      `SELECT id, status, train_score, test_score, score, total, overfit_flag, submitted_at
       FROM submissions WHERE user_id = ? ORDER BY submitted_at DESC`
    )
    .all(req.user!.sub) as { id: string }[];

  const zoneStmt = db.prepare(
    `SELECT zone, COUNT(*) c FROM submission_questions WHERE submission_id = ? GROUP BY zone`
  );

  const withZones = rows.map((row) => {
    const zoneRows = zoneStmt.all(row.id) as { zone: string; c: number }[];
    const counts = { pass_count: 0, gray_count: 0, fail_count: 0 };
    for (const z of zoneRows) {
      if (z.zone === "pass") counts.pass_count = z.c;
      if (z.zone === "gray") counts.gray_count = z.c;
      if (z.zone === "fail") counts.fail_count = z.c;
    }
    return { ...row, ...counts };
  });

  return res.json({ submissions: withZones, remaining: Math.max(0, getMaxSubmissions() - rows.length) });
});

// GET /api/submissions/leaderboard (public, best submission per user, speed tie-break)
router.get("/leaderboard", (_req, res: Response) => {
  const rows = db
    .prepare(
      `WITH best AS (
         SELECT u.id AS user_id, s.score AS best_score, s.submitted_at AS submitted_at,
                ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY s.score DESC, s.submitted_at ASC) AS rn
         FROM submissions s
         JOIN users u ON u.id = s.user_id
         WHERE s.status = 'scored'
       )
       SELECT u.name AS name, b.best_score AS best_score, b.submitted_at AS submitted_at
       FROM users u
       LEFT JOIN best b ON b.user_id = u.id AND b.rn = 1
       WHERE u.role = 'user'
       ORDER BY (b.best_score IS NULL) ASC, b.best_score DESC, b.submitted_at ASC, LOWER(u.name) ASC`
    )
    .all();

  return res.json({ leaderboard: rows });
});

export default router;
