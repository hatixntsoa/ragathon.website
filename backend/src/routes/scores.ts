import { Router, Response } from "express";
import { db } from "../db";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { recomputeScore } from "./evaluation";
import { getIo } from "../socket";
import { logAction } from "../logger";

const router = Router();

router.use(requireAuth, requireRole("admin"));

// GET /api/admin/scores
router.get("/", (_req, res: Response) => {
  const submissions = db
    .prepare(
      `SELECT s.id, u.name AS user_name, s.status, s.score, s.total, s.submitted_at
       FROM submissions s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.submitted_at DESC`
    )
    .all() as { id: string; user_name: string; status: string; score: number | null; total: number | null; submitted_at: string }[];

  const questionStmt = db.prepare(
    `SELECT id, question_id, expected, generated, similarity, zone, review_status
     FROM submission_questions WHERE submission_id = ? ORDER BY question_id ASC`
  );
  const zoneStmt = db.prepare(
    `SELECT zone, COUNT(*) c FROM submission_questions WHERE submission_id = ? GROUP BY zone`
  );

  const withQuestions = submissions.map((s) => {
    const zoneRows = zoneStmt.all(s.id) as { zone: string; c: number }[];
    const counts = { pass_count: 0, gray_count: 0, fail_count: 0 };
    for (const z of zoneRows) {
      if (z.zone === "pass") counts.pass_count = z.c;
      if (z.zone === "gray") counts.gray_count = z.c;
      if (z.zone === "fail") counts.fail_count = z.c;
    }
    return { ...s, ...counts, questions: questionStmt.all(s.id) };
  });

  return res.json({ submissions: withQuestions });
});

// POST /api/admin/scores/:submissionId/questions/:questionId/review  { decision: 'approved' | 'rejected' }
router.post("/:submissionId/questions/:questionId/review", (req: AuthedRequest, res: Response) => {
  const { submissionId, questionId } = req.params;
  const { decision } = req.body as { decision?: "approved" | "rejected" };
  if (decision !== "approved" && decision !== "rejected") {
    return res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
  }

  const question = db
    .prepare("SELECT id FROM submission_questions WHERE id = ? AND submission_id = ?")
    .get(questionId, submissionId);
  if (!question) return res.status(404).json({ error: "Question not found" });

  db.prepare("UPDATE submission_questions SET review_status = ? WHERE id = ?").run(decision, questionId);
  recomputeScore(submissionId);
  getIo()?.emit("leaderboard:refresh");
  logAction("submission.question_reviewed", { submissionId, questionId, decision });

  return res.json({ status: "ok" });
});

export default router;