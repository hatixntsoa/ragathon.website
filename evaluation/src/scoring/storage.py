import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path("submissions.db")


def init_db(db_path: Path = DB_PATH) -> None:
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            participant_id TEXT NOT NULL,
            score REAL NOT NULL,
            total INTEGER NOT NULL,
            pass_count INTEGER NOT NULL,
            gray_count INTEGER NOT NULL,
            fail_count INTEGER NOT NULL,
            submitted_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def save_submission(
    participant_id: str,
    score: float,
    total: int,
    pass_count: int,
    gray_count: int,
    fail_count: int,
    submitted_at: datetime,
    db_path: Path = DB_PATH,
) -> None:
    conn = sqlite3.connect(db_path)
    conn.execute(
        """INSERT INTO submissions
           (participant_id, score, total, pass_count, gray_count, fail_count, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            participant_id,
            score,
            total,
            pass_count,
            gray_count,
            fail_count,
            submitted_at.isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def count_submissions(participant_id: str, db_path: Path = DB_PATH) -> int:
    conn = sqlite3.connect(db_path)
    cursor = conn.execute(
        "SELECT COUNT(*) FROM submissions WHERE participant_id = ?", (participant_id,)
    )
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_all_submissions(
    db_path: Path = DB_PATH,
) -> dict[str, list[tuple[float, datetime]]]:
    conn = sqlite3.connect(db_path)
    cursor = conn.execute("SELECT participant_id, score, submitted_at FROM submissions")
    rows = cursor.fetchall()
    conn.close()

    result: dict[str, list[tuple[float, datetime]]] = {}
    for participant_id, score, submitted_at_str in rows:
        result.setdefault(participant_id, []).append(
            (score, datetime.fromisoformat(submitted_at_str))
        )
    return result
