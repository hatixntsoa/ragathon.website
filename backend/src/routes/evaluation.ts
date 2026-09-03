import { Router, Response } from "express";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { logAction } from "../logger";
import { getIo } from "../socket";

// Must match MAX_SUBMISSIONS in evaluation/src/scoring/api.py.
export const MAX_SUBMISSIONS = Number(process.env.MAX_SUBMISSIONS) || 3;

let maxSubmissionsCache = MAX_SUBMISSIONS;

const router = Router();

const UPLOAD_DIR = path.join(__dirname, "..", "..", "data", "uploads");
const EVALUATION_SERVICE_URL = process.env.EVALUATION_SERVICE_URL || "http://localhost:8000";

const queue: string[] = [];
let processing = false;

export function enqueueEvaluation(submissionId: string): void {
  queue.push(submissionId);
  processQueue();
}

async function processQueue(): Promise<void> {
  if (processing) return;
  const next = queue.shift();
  if (!next) return;
  processing = true;
  try {
    await evaluateOne(next);
  } finally {
    processing = false;
    processQueue();
  }
}

interface QuestionResult {
  question_id: string;
  expected: string;
  generated: string;
  similarity: number;
  zone: "pass" | "gray" | "fail";
}

interface ScoreResponse {
  score: number;
  total: number;
  zone_breakdown: { pass: number; gray: number; fail: number };
  questions: QuestionResult[];
}

async function evaluateOne(submissionId: string): Promise<void> {
  db.prepare("UPDATE submissions SET status = 'evaluating' WHERE id = ?").run(submissionId);
  getIo()?.emit("leaderboard:refresh");
  logAction("submission.evaluating", { submissionId });

  try {
    const row = db
      .prepare("SELECT model_filename FROM submissions WHERE id = ?")
      .get(submissionId) as { model_filename: string } | undefined;
    if (!row) throw new Error("submission not found");

    const filePath = path.join(UPLOAD_DIR, row.model_filename);
    const answers = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const res = await fetch(`${EVALUATION_SERVICE_URL}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) throw new Error(`evaluation service responded ${res.status}`);

    const result = (await res.json()) as ScoreResponse;

    const insertQuestion = db.prepare(
      `INSERT INTO submission_questions (id, submission_id, question_id, expected, generated, similarity, zone, review_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const tx = db.transaction(() => {
      for (const q of result.questions) {
        insertQuestion.run(
          uuidv4(),
          submissionId,
          q.question_id,
          q.expected,
          q.generated,
          q.similarity,
          q.zone,
          q.zone === "gray" ? "pending" : "none"
        );
      }
      db.prepare(
        `UPDATE submissions SET status = 'scored', score = ?, test_score = ?, train_score = ?, total = ? WHERE id = ?`
      ).run(result.score, result.score, result.score, result.total, submissionId);
    });
    tx();

    logAction("submission.scored", { submissionId, score: result.score, total: result.total });
  } catch (err) {
    db.prepare("UPDATE submissions SET status = 'failed' WHERE id = ?").run(submissionId);
    logAction("submission.failed", { submissionId, error: String(err) });
  } finally {
    getIo()?.emit("leaderboard:refresh");
  }
}

export function runEvaluation(submissionId: string): void {
  enqueueEvaluation(submissionId);
}

export function getMaxSubmissions(): number {
  return maxSubmissionsCache;
}

// Recomputes a submission's score from pass + admin-approved gray questions.
// Called by the Scores review route after every approve/reject decision.
export function recomputeScore(submissionId: string): void {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM submission_questions
       WHERE submission_id = ? AND (zone = 'pass' OR review_status = 'approved')`
    )
    .get(submissionId) as { c: number };
  db.prepare("UPDATE submissions SET score = ?, test_score = ?, train_score = ? WHERE id = ?").run(
    row.c,
    row.c,
    row.c,
    submissionId
  );
}

router.post("/:id/rerun", requireAuth, requireRole("admin"), (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const submission = db.prepare("SELECT id FROM submissions WHERE id = ?").get(id);
  if (!submission) return res.status(404).json({ error: "Submission not found" });
  db.prepare("DELETE FROM submission_questions WHERE submission_id = ?").run(id);
  runEvaluation(id);
  return res.json({ status: "pending" });
});

export default router;