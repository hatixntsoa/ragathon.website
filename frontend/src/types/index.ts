export type Role = "admin" | "user";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export type SubmissionStatus = "pending" | "evaluating" | "scored" | "failed";

export interface Submission {
  id: string;
  status: SubmissionStatus;
  train_score: number | null;
  test_score: number | null;
  score: number | null;
  overfit_flag: 0 | 1 | null;
  submitted_at: string;
}

export interface LeaderboardEntry {
  name: string;
  email?: string;
  best_score: number | null;
}

export type TimerStatus = "stopped" | "running" | "paused";

export interface TimerState {
  duration_ms: number;
  remaining_ms: number;
  status: TimerStatus;
  server_time: number;
}

export interface AdminUserRow {
  short_id: string;
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
  has_pending?: boolean;
  plain_password?: string | null;
  submissions: { id: string; status: SubmissionStatus; score: number | null; submitted_at: string }[];
}
