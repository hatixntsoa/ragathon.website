from datetime import datetime
from pathlib import Path

from scoring.storage import init_db, save_submission, count_submissions

# Use a throwaway test DB, never the real submissions.db
TEST_DB = Path("test_submissions.db")

# Clean slate for a repeatable test
if TEST_DB.exists():
    TEST_DB.unlink()

init_db(TEST_DB)

print("Before any submission:", count_submissions("X", TEST_DB))

save_submission(
    participant_id="X",
    score=8,
    total=10,
    pass_count=8,
    gray_count=1,
    fail_count=1,
    submitted_at=datetime(2026, 1, 1, 10, 10),
    db_path=TEST_DB,
)
print("After 1 submission:", count_submissions("X", TEST_DB))

save_submission(
    participant_id="X",
    score=5,
    total=10,
    pass_count=5,
    gray_count=2,
    fail_count=3,
    submitted_at=datetime(2026, 1, 1, 10, 20),
    db_path=TEST_DB,
)
print("After 2 submissions:", count_submissions("X", TEST_DB))

print("Participant Y (never submitted):", count_submissions("Y", TEST_DB))

# Clean up after the test — this DB is throwaway, never leave it on disk.
if TEST_DB.exists():
    TEST_DB.unlink()
