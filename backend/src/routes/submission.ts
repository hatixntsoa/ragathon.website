import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { runEvaluation } from "./evaluation";

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
    const allowed = [".pkl"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only .pkl files are accepted"));
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

    const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
    const modelFile = files?.model?.[0];

    if (!modelFile) {
      return res.status(400).json({ error: "model.pkl is required" });
    }

    const id = uuidv4();
    const userId = req.user!.sub;

    db.prepare(
      `INSERT INTO submissions (id, user_id, model_filename, notebook_filename, status)
       VALUES (?, ?, ?, ?, 'pending')`
    ).run(id, userId, modelFile.filename, "");

    // Queue evaluation asynchronously so the request returns immediately.
    setImmediate(() => runEvaluation(id));

    return res.status(201).json({ submissionId: id, status: "pending" });
  }
);

// GET /api/submissions/mine
router.get("/mine", requireAuth, (req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare(
      `SELECT id, status, train_score, test_score, score, overfit_flag, submitted_at
       FROM submissions WHERE user_id = ? ORDER BY submitted_at DESC`
    )
    .all(req.user!.sub);
  return res.json({ submissions: rows });
});

// GET /api/submissions/leaderboard (public, MAX(score) per user)
router.get("/leaderboard", (_req, res: Response) => {
  const rows = db
    .prepare(
      `SELECT u.name AS name, MAX(s.score) AS best_score
       FROM submissions s
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'scored'
       GROUP BY s.user_id
       ORDER BY best_score DESC`
    )
    .all();

  if (rows.length === 0) {
    // No scored submissions yet: fall back to registered participants, alphabetical.
    const fallback = db
      .prepare(`SELECT name, NULL AS best_score FROM users WHERE role = 'user' ORDER BY name ASC`)
      .all();
    return res.json({ leaderboard: fallback });
  }

  return res.json({ leaderboard: rows });
});

export default router;
