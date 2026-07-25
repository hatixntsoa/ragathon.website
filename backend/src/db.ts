import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

function randomPassword(length = 20): string {
  return crypto.randomBytes(length).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, length);
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
  `);

  const timerRow = db.prepare("SELECT id FROM timer WHERE id = 1").get();
  if (!timerRow) {
    db.prepare(
      `INSERT INTO timer (id, duration_ms, remaining_ms, status, last_update)
       VALUES (1, 14400000, 14400000, 'stopped', ?)`
    ).run(Date.now());
  }

  const adminRow = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@ragathon.local");
  if (!adminRow) {
    const passwordHash = bcrypt.hashSync("admin123", 10);
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, 'admin')`
    ).run(uuidv4(), "admin@ragathon.local", "Admin", passwordHash);
    // eslint-disable-next-line no-console
    console.log("Seeded default admin -> admin@ragathon.local / admin123 (change this immediately)");
  }

  const participantCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user'").get() as { c: number };
  if (participantCount.c === 0) {
    const names = ["Alice Rakoto", "Bruno Rasolofo", "Chloe Andria", "David Ravel", "Elina Rabe"];
    console.log("Seeded 5 default participants (save these passwords, they are not recoverable):");
    for (let i = 0; i < names.length; i++) {
      const password = randomPassword(20);
      const email = `participant${i + 1}@ragathon.local`;
      db.prepare(
        `INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, 'user')`
      ).run(uuidv4(), email, names[i], bcrypt.hashSync(password, 10));
      console.log(`  ${email} / ${password}`);
    }
  }
}
