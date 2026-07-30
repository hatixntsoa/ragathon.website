import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

function randomPassword(length = 20): string {
  return crypto.randomBytes(length).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, length);
}

function randomHex(length = 20): string {
  // length is hex chars count — generate length/2 bytes
  const bytes = Math.ceil(length / 2);
  return crypto.randomBytes(bytes).toString("hex").slice(0, length);
}

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "ragathon.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','user')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      model_filename TEXT NOT NULL,
      notebook_filename TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','evaluating','scored','failed')),
      train_score REAL,
      test_score REAL,
      score REAL,
      overfit_flag INTEGER,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS timer (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      duration_ms INTEGER NOT NULL DEFAULT 14400000,
      remaining_ms INTEGER NOT NULL DEFAULT 14400000,
      status TEXT NOT NULL DEFAULT 'stopped' CHECK(status IN ('stopped','running','paused')),
      last_update INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS pending_credentials (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      plain_password TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submission_questions (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL,
      expected TEXT NOT NULL,
      generated TEXT NOT NULL,
      similarity REAL NOT NULL,
      zone TEXT NOT NULL CHECK(zone IN ('pass','gray','fail')),
      review_status TEXT NOT NULL DEFAULT 'none' CHECK(review_status IN ('none','pending','approved','rejected'))
    );
  `);

  // Ensure short_id column exists on users (4 hex chars), add unique index
  const cols = db.prepare("PRAGMA table_info(users)").all();
  const hasShort = cols.some((c:any) => c.name === 'short_id');
  if (!hasShort) {
    db.prepare("ALTER TABLE users ADD COLUMN short_id TEXT").run();
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_short_id ON users(short_id)").run();
  }

  const subCols = db.prepare("PRAGMA table_info(submissions)").all();
  const hasTotal = subCols.some((c: any) => c.name === 'total');
  if (!hasTotal) {
    db.prepare("ALTER TABLE submissions ADD COLUMN total INTEGER").run();
  }

  const timerRow = db.prepare("SELECT id FROM timer WHERE id = 1").get();
  if (!timerRow) {
    db.prepare(
      `INSERT INTO timer (id, duration_ms, remaining_ms, status, last_update)
       VALUES (1, 14400000, 14400000, 'stopped', ?)`
    ).run(Date.now());
  }

  const adminRow = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@ragathon.local");
  if (!adminRow) {
    // generate a secure random 20-hex password for the default admin
    const defaultPassword = randomHex(20);
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);
    const adminId = uuidv4();
    // generate a unique 4-hex short id
    function genShort() {
      return crypto.randomBytes(2).toString('hex').slice(0,4);
    }
    let shortId = genShort();
    let attempts = 0;
    while (db.prepare('SELECT id FROM users WHERE short_id = ?').get(shortId) && attempts < 10) {
      shortId = genShort();
      attempts++;
    }
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, role, short_id) VALUES (?, ?, ?, ?, 'admin', ?)`
    ).run(adminId, "admin@ragathon.local", "Admin", passwordHash, shortId);
    // eslint-disable-next-line no-console
    console.log(`Seeded default admin -> username: admin / email: admin@ragathon.local / password: ${defaultPassword} / short_id: ${shortId}`);
    try {
      // write into log as well so operator can find it in server logs
      const { logAction } = require("./logger");
      logAction("server.seed_admin", { userId: adminId, email: "admin@ragathon.local" });
    } catch {}
  }

  // participant seeding removed: users will be provisioned via admin upload (excel) or manual creation
  // Previously the code created dummy participants at first run; keeping the DB clean for real participants.
}
