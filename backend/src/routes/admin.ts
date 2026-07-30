import { Router, Response, Request } from "express";
import { db } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { startTimer, pauseTimer, resetTimer, setDuration, computeCurrentState } from "../socket";
import multer from "multer";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../admin_email";
import { logAction } from "../logger";
import crypto from "crypto";

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

// GET /api/admin/users  (list logged-in users + submission history + pending credential flag)
router.get("/users", (_req, res: Response) => {
  const users = db
    .prepare(`SELECT u.id, u.short_id, u.email, u.name, u.role, u.created_at, p.plain_password IS NOT NULL AS has_pending, p.plain_password AS plain_password FROM users u LEFT JOIN pending_credentials p ON p.user_id = u.id WHERE u.role != 'admin' ORDER BY u.created_at DESC`)
    .all() as any[];

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

  const result = users.map((u) => ({
    id: u.id,
    short_id: u.short_id,
    email: u.email,
    name: u.name,
    role: u.role,
    created_at: u.created_at,
    has_pending: !!u.has_pending,
    plain_password: u.plain_password || null,
    submissions: byUser[u.id] || [],
  }));

  return res.json({ users: result });
});

// Edit user
router.put('/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as { name?: string; email?: string; role?: string; password?: string };
  console.log(`[admin] PUT /users/${id} body=`, { ...body, password: body.password ? '***' : undefined });
  try {
    const { name, email, role, password } = body;
    // support short_id as identifier as well
    const user = db.prepare('SELECT id, short_id, email FROM users WHERE id = ? OR short_id = ?').get(id, id);
    if (!user) {
      console.log(`[admin] user not found for identifier ${id}`);
      return res.status(404).json({ error: 'not_found' });
    }
    const realId = user.id;
    console.log(`[admin] resolved user id=${realId} short_id=${user.short_id} email=${user.email}`);
    if (email) {
      // ensure unique
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, realId);
      if (existing) {
        console.log(`[admin] email ${email} already taken`);
        return res.status(400).json({ error: 'email_taken' });
      }
    }
    // update basic fields
    db.prepare('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?').run(name, email, realId);
    // if password provided, hash and update
    if (password && String(password).trim().length > 0) {
      const passwordHash = bcrypt.hashSync(String(password), 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, realId);
      // also remove pending credentials if present
      try { db.prepare('DELETE FROM pending_credentials WHERE user_id = ?').run(realId); } catch (e) { console.error('[admin] failed to delete pending_credentials', e); }
      console.log(`[admin] updated password for user ${realId}`);
    }
    if (role) {
      // only allow changing role if provided and valid
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, realId);
    }
    logAction('admin.users.updated', { userId: realId });
    console.log(`[admin] user ${realId} updated successfully`);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin] failed to update user', err);
    return res.status(500).json({ error: 'update_failed' });
  }
});

// Delete user (also remove related data)
router.delete('/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`[admin] DELETE /users/${id} requested`);
  // resolve either uuid or short_id
  const user = db.prepare('SELECT id, short_id, email FROM users WHERE id = ? OR short_id = ?').get(id, id);
  if (!user) {
    console.log(`[admin] user not found for identifier ${id}`);
    return res.status(404).json({ error: 'not_found' });
  }
  const realId = user.id;
  console.log(`[admin] resolved user to id=${realId} short_id=${user.short_id} email=${user.email}`);

  try {
    const tx = db.transaction((uid: string) => {
      // remove submissions
      const delSub = db.prepare('DELETE FROM submissions WHERE user_id = ?').run(uid);
      console.log(`[admin] deleted submissions count=${delSub.changes}`);
      // remove pending credentials
      const delPending = db.prepare('DELETE FROM pending_credentials WHERE user_id = ?').run(uid);
      console.log(`[admin] deleted pending_credentials count=${delPending.changes}`);
      // finally remove user
      const delUser = db.prepare('DELETE FROM users WHERE id = ?').run(uid);
      console.log(`[admin] deleted users count=${delUser.changes}`);
    });
    tx(realId);
    logAction('admin.users.deleted', { userId: realId });
    console.log(`[admin] user ${realId} deletion completed`);
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[admin] failed to delete user', err);
    return res.status(500).json({ error: 'delete_failed' });
  }
});

// Upload participants Excel
const upload = multer({ dest: path.join(__dirname, "..", "..", "data", "uploads") });
router.post("/users/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file required" });
    console.log(`[admin] upload participants file=${req.file.path} originalname=${req.file.originalname}`);
    const wb = XLSX.readFile(req.file.path);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    console.log(`[admin] parsed ${rows.length} rows from excel`);

    const created: { id: string; email: string; name: string; password: string; short_id?: string }[] = [];

    for (const r of rows) {
      const email = String(r["Emails"] || r["Email"] || r["emails"] || "").trim();
      const name = String(r["Usernames"] || r["Usernames"] || r["Usernames"] || r["Username"] || r["User"] || "").trim();
      if (!email) continue;
      const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (exists) continue;
      const id = uuidv4();
      // generate 20 hex chars (10 bytes)
      const plain = crypto.randomBytes(10).toString('hex').slice(0, 20);
      const hash = bcrypt.hashSync(plain, 10);
      // generate unique short_id (4 hex chars)
      function genShort() { return crypto.randomBytes(2).toString('hex').slice(0,4); }
      let shortId = genShort();
      let attempts = 0;
      while (db.prepare('SELECT id FROM users WHERE short_id = ?').get(shortId) && attempts < 10) {
        shortId = genShort();
        attempts++;
      }
      db.prepare("INSERT INTO users (id, email, name, password_hash, role, short_id) VALUES (?, ?, ?, ?, 'user', ?)").run(id, email, name || email.split("@")[0], hash, shortId);
      db.prepare("INSERT OR REPLACE INTO pending_credentials (user_id, plain_password) VALUES (?, ?)").run(id, plain);
      created.push({ id, email, short_id: shortId, name: name || email.split("@")[0], password: plain });
      logAction("admin.users.uploaded", { userId: id, email });
      console.log(`[admin] created user id=${id} short_id=${shortId} email=${email}`);
    }

    // cleanup uploaded file
    try { fs.unlinkSync(req.file.path); } catch {}

    console.log(`[admin] upload complete, created ${created.length} users`);
    return res.json({ created });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[admin] upload failed', err);
    return res.status(500).json({ error: "upload_failed" });
  }
});

// GET /api/admin/settings
router.get("/settings", (_req, res: Response) => {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return res.json(out);
});

// POST /api/admin/settings
router.post("/settings", (req: Request, res: Response) => {
  const data = req.body as Record<string, string>;
  const insert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  const keys = Object.keys(data);
  for (const k of keys) insert.run(k, data[k]);
  logAction("admin.settings.updated", { keys });
  return res.json({ ok: true });
});

// POST /api/admin/settings/test-smtp
router.post("/settings/test-smtp", async (_req, res: Response) => {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  const smtpUser = settings["gmail_user"];
  const smtpPass = settings["gmail_pass"];
  if (!smtpUser || !smtpPass) return res.status(400).json({ error: "smtp_not_configured" });
  try {
    await sendEmail(smtpUser, smtpPass, smtpUser, "RAGATHON SMTP test", "This is a test message from RAGATHON");
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: "smtp_failed" });
  }
});

// POST /api/admin/users/send   { userIds?: string[] }
router.post("/users/send", async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body as { userIds?: string[] };
    const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;

    const smtpUser = settings["gmail_user"];
    const smtpPass = settings["gmail_pass"];
    const template = settings["email_template"] || `Greetings {{name}},

Welcome to RAGATHON 2026 !

All the instructions needed for this first edition of RAG Competition can be found here:
https://drive.google.com/file/d/1DHk-6lFuH6VUiM2uN1yswOabQHqw3eHy/view?usp=sharing

An optional boilerplate template can be found here as well:
https://github.com/ilaikoto/ragathon.starter.kit

And for the response submission you will need to use this custom platform below:

Platform: https://ragathon.ilaikoto.com
Username: {{name}}
Password: {{password}}

Good luck and have fun!`;

    if (!smtpUser || !smtpPass) return res.status(400).json({ error: "smtp_not_configured" });

    const toSend = userIds && userIds.length > 0
      ? db.prepare("SELECT u.id, u.email, u.name, p.plain_password FROM users u JOIN pending_credentials p ON p.user_id = u.id WHERE (u.id IN (" + userIds.map(() => "?").join(",") + ") OR u.short_id IN (" + userIds.map(() => "?").join(",") + "))").all(...userIds, ...userIds)
      : db.prepare("SELECT u.id, u.email, u.name, p.plain_password FROM users u JOIN pending_credentials p ON p.user_id = u.id").all();

    for (const row of toSend) {
      const html = template.replace(/{{name}}/g, row.name).replace(/{{email}}/g, row.email).replace(/{{password}}/g, row.plain_password);
      try {
        await sendEmail(smtpUser, smtpPass, row.email, "RAGATHON 2026 - Participant Instructions", html);
        db.prepare("DELETE FROM pending_credentials WHERE user_id = ?").run(row.id);
        logAction("admin.users.credentials.sent", { userId: row.id, email: row.email });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("email send failed", err);
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: "send_failed" });
  }
});

// POST /api/admin/users/delete  { id: string }
router.post('/users/delete', (req: Request, res: Response) => {
  const { id } = req.body as { id?: string };
  if (!id) return res.status(400).json({ error: 'id_required' });
  console.log(`[admin] POST /users/delete id=${id}`);
  const user = db.prepare('SELECT id, short_id, email FROM users WHERE id = ? OR short_id = ?').get(id, id);
  if (!user) {
    console.log(`[admin] user not found for identifier ${id}`);
    return res.status(404).json({ error: 'not_found' });
  }
  const realId = user.id;
  try {
    const tx = db.transaction((uid: string) => {
      const delSub = db.prepare('DELETE FROM submissions WHERE user_id = ?').run(uid);
      console.log(`[admin] deleted submissions count=${delSub.changes}`);
      const delPending = db.prepare('DELETE FROM pending_credentials WHERE user_id = ?').run(uid);
      console.log(`[admin] deleted pending_credentials count=${delPending.changes}`);
      const delUser = db.prepare('DELETE FROM users WHERE id = ?').run(uid);
      console.log(`[admin] deleted users count=${delUser.changes}`);
    });
    tx(realId);
    logAction('admin.users.deleted', { userId: realId });
    console.log(`[admin] user ${realId} deletion completed via POST /users/delete`);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin] failed to delete user (post)', err);
    return res.status(500).json({ error: 'delete_failed' });
  }
});

export default router;
