from datetime import datetime, timedelta

from scoring.ranking import Submission, rank_participants

t0 = datetime(2026, 1, 1, 10, 0)

x_subs = [Submission("X", 8, t0 + timedelta(minutes=10))]
y_subs = [
    Submission("Y", 4, t0 + timedelta(minutes=5)),
    Submission("Y", 8, t0 + timedelta(minutes=35)),
]

leaderboard = rank_participants({"X": x_subs, "Y": y_subs})
for s in leaderboard:
    print(s.participant_id, s.score, s.submitted_at)
