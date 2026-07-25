import { Router, Response } from "express";
import path from "path";
import PDFDocument from "pdfkit";
import { db } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

interface LeaderboardRow {
  name: string;
  email: string;
  best_score: number | null;
}

function getFullLeaderboard(): LeaderboardRow[] {
  return db
    .prepare(
      `SELECT u.name AS name, u.email AS email, MAX(s.score) AS best_score
       FROM submissions s
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'scored'
       GROUP BY s.user_id
       ORDER BY best_score DESC`
    )
    .all() as LeaderboardRow[];
}

// GET /api/export/leaderboard.csv (admin-only)
router.get("/leaderboard.csv", requireAuth, requireRole("admin"), (_req, res: Response) => {
  const rows = getFullLeaderboard();
  const header = "Rank,Name,Email,Score\n";
  const body = rows
    .map((r, i) => `${i + 1},"${r.name}","${r.email}",${r.best_score ?? ""}`)
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=ragathon-leaderboard.csv");
  return res.send(header + body);
});

// GET /api/export/report.pdf (admin-only, full report: points, ranks, user details)
router.get("/report.pdf", requireAuth, requireRole("admin"), (_req, res: Response) => {
  const rows = getFullLeaderboard();
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=ragathon-report.pdf");
  doc.pipe(res);

  doc.fontSize(22).text("RAGATHON - Full Report", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#555555").text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown(1.5);

  doc.fillColor("#000000").fontSize(14).text("Final Rankings");
  doc.moveDown(0.5);

  const startX = 50;
  let y = doc.y;
  const colWidths = [50, 180, 220, 80];

  doc.fontSize(11).font("Helvetica-Bold");
  doc.text("Rank", startX, y, { width: colWidths[0] });
  doc.text("Name", startX + colWidths[0], y, { width: colWidths[1] });
  doc.text("Email", startX + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
  doc.text("Score", startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
  y += 20;
  doc.moveTo(startX, y).lineTo(550, y).strokeColor("#cccccc").stroke();
  y += 8;

  doc.font("Helvetica");
  rows.forEach((r, i) => {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
    doc.text(String(i + 1), startX, y, { width: colWidths[0] });
    doc.text(r.name, startX + colWidths[0], y, { width: colWidths[1] });
    doc.text(r.email, startX + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
    doc.text(
      r.best_score !== null ? r.best_score.toFixed(4) : "-",
      startX + colWidths[0] + colWidths[1] + colWidths[2],
      y,
      { width: colWidths[3] }
    );
    y += 18;
  });

  doc.end();
});

// GET /api/export/database (admin-only, raw ragathon.db backup)
router.get("/database", requireAuth, requireRole("admin"), (_req, res: Response) => {
  const dbPath = path.join(__dirname, "..", "..", "data", "ragathon.db");
  return res.download(dbPath, "ragathon.db");
});

export default router;
