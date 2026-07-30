export type Role = "admin" | "user";

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  created_at: string;
}

export type SubmissionStatus = "pending" | "evaluating" | "scored" | "failed";

export interface Submission {
  id: string;
  status: SubmissionStatus;
  train_score: number | null;
  test_score: number | null;
  score: number | null;
  total: number | null;
  overfit_flag: 0 | 1 | null;
  submitted_at: string;
  pass_count: number;
  gray_count: number;
  fail_count: number;
}

export type TimerStatus = "stopped" | "running" | "paused";

export interface TimerState {
  duration_ms: number;
  remaining_ms: number;
  status: TimerStatus;
  server_time: number;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
}
