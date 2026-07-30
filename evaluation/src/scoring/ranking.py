from dataclasses import dataclass
from datetime import datetime


@dataclass
class Submission:
    participant_id: str
    score: float
    submitted_at: datetime


def best_submission(submissions: list[Submission]) -> Submission:
    """Among a participant's submissions, pick the highest score.
    On a tie, prefer the earliest timestamp (rewards speed)."""
    return max(submissions, key=lambda s: (s.score, -s.submitted_at.timestamp()))


def rank_participants(all_submissions: dict[str, list[Submission]]) -> list[Submission]:
    """One best submission per participant, sorted for the final leaderboard."""
    bests = [best_submission(subs) for subs in all_submissions.values()]
    return sorted(bests, key=lambda s: (-s.score, s.submitted_at.timestamp()))

