import { Router, Response } from "express";
import { db } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

const router = Router();

/**
 * Mocked evaluation engine.
 *
 * In production this would drop the uploaded model artifact into an
 * isolated sandbox (e.g. a disposable container with no network access), run
 * inference against a hidden test set, and record the resulting metrics.
 * That sandboxing step is mocked here with a deterministic-but-randomized
 * scoring function so the rest of the platform (status flow, leaderboard,
 * exports) is fully wired end to end.
 */
import { logAction } from "../logger";

export function runEvaluation(submissionId: string): void {
  db.prepare("UPDATE submissions SET status = 'evaluating' WHERE id = ?").run(submissionId);
  logAction("submission.evaluating", { submissionId });

  const delayMs = 4000 + Math.random() * 4000;

  setTimeout(() => {
    try {
      const trainScore = round(0.7 + Math.random() * 0.29);
      // Test score trails training score to emulate real generalization gaps.
      const gap = Math.random() * 0.18;
      const testScore = round(Math.max(0.35, trainScore - gap));
      const overfit = trainScore - testScore > 0.12 ? 1 : 0;

      db.prepare(
        `UPDATE submissions
         SET status = 'scored', train_score = ?, test_score = ?, score = ?, overfit_flag = ?
         WHERE id = ?`
      ).run(trainScore, testScore, testScore, overfit, submissionId);

      logAction("submission.scored", { submissionId, trainScore, testScore, score: testScore, overfit });
    } catch (err) {
      db.prepare("UPDATE submissions SET status = 'failed' WHERE id = ?").run(submissionId);
      logAction("submission.failed", { submissionId, error: String(err) });
    }
  }, delayMs);
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// POST /api/evaluation/:id/rerun  (admin-only manual re-trigger)
router.post("/:id/rerun", requireAuth, requireRole("admin"), (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const submission = db.prepare("SELECT id FROM submissions WHERE id = ?").get(id);
  if (!submission) {
    return res.status(404).json({ error: "Submission not found" });
  }
  runEvaluation(id);
  return res.json({ status: "evaluating" });
});

export default router;
