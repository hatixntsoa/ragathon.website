import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { db } from "./db";
import { TimerState, TimerStatus } from "./types";

let io: Server | null = null;

interface TimerRow {
  duration_ms: number;
  remaining_ms: number;
  status: TimerStatus;
  last_update: number;
}

function getTimerRow(): TimerRow {
  return db.prepare("SELECT duration_ms, remaining_ms, status, last_update FROM timer WHERE id = 1").get() as TimerRow;
}

// Computes the true remaining time right now, accounting for elapsed time since last_update if running.
export function computeCurrentState(): TimerState {
  const row = getTimerRow();
  let remaining = row.remaining_ms;
  if (row.status === "running") {
    const elapsed = Date.now() - row.last_update;
    remaining = Math.max(0, row.remaining_ms - elapsed);
  }
  return {
    duration_ms: row.duration_ms,
    remaining_ms: remaining,
    status: row.status,
    server_time: Date.now(),
  };
}

function persistSnapshot(): void {
  // Freezes remaining_ms at "now" and stamps last_update, used before pausing/stopping/changing duration.
  const state = computeCurrentState();
  db.prepare("UPDATE timer SET remaining_ms = ?, last_update = ? WHERE id = 1").run(
    state.remaining_ms,
    Date.now()
  );
}

export function broadcastTimer(): void {
  if (!io) return;
  io.emit("timer:update", computeCurrentState());
}

export function startTimer(): TimerState {
  const row = getTimerRow();
  const remaining = row.status === "stopped" ? row.duration_ms : row.remaining_ms;
  db.prepare("UPDATE timer SET status = 'running', remaining_ms = ?, last_update = ? WHERE id = 1").run(
    remaining,
    Date.now()
  );
  broadcastTimer();
  return computeCurrentState();
}

export function pauseTimer(): TimerState {
  persistSnapshot();
  db.prepare("UPDATE timer SET status = 'paused' WHERE id = 1").run();
  broadcastTimer();
  return computeCurrentState();
}

export function resetTimer(newDurationMs?: number): TimerState {
  const row = getTimerRow();
  const duration = newDurationMs ?? row.duration_ms;
  db.prepare(
    "UPDATE timer SET status = 'stopped', duration_ms = ?, remaining_ms = ?, last_update = ? WHERE id = 1"
  ).run(duration, duration, Date.now());
  broadcastTimer();
  return computeCurrentState();
}

export function setDuration(durationMs: number): TimerState {
  db.prepare(
    "UPDATE timer SET duration_ms = ?, remaining_ms = ?, status = 'stopped', last_update = ? WHERE id = 1"
  ).run(durationMs, durationMs, Date.now());
  broadcastTimer();
  return computeCurrentState();
}

export function initSocket(httpServer: HttpServer, corsOrigin: string): Server {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    socket.emit("timer:update", computeCurrentState());

    socket.on("timer:request_sync", () => {
      socket.emit("timer:update", computeCurrentState());
    });

    socket.on("leaderboard:request_refresh", () => {
      io?.emit("leaderboard:refresh");
    });
  });

  // Periodic heartbeat keeps clients honest even if an event was missed.
  setInterval(() => {
    const state = computeCurrentState();
    if (state.status === "running") {
      io?.emit("timer:update", state);
      if (state.remaining_ms <= 0) {
        pauseTimer();
      }
    }
  }, 5000);

  return io;
}

export function getIo(): Server | null {
  return io;
}
