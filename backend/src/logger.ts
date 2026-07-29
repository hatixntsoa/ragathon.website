import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function fmtDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  const HH = String(d.getHours()).padStart(2, "0");
  const MM = String(d.getMinutes()).padStart(2, "0");
  return `${mm}_${dd}_${yyyy}_${HH}_${MM}`;
}

const LOG_BASENAME = `ragathon_${fmtDate(new Date())}`;
const LOG_PATH = path.join(DATA_DIR, `${LOG_BASENAME}.log`);

export function getLogPath() {
  return LOG_PATH;
}

export function logAction(action: string, details?: any) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      action,
      details: details === undefined ? null : details,
    };
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to write log", err);
  }
}

export function getCurrentBasename() {
  return LOG_BASENAME;
}
