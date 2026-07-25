import express from "express";
import cors from "cors";
import { createServer } from "http";
import dotenv from "dotenv";
import { initDb } from "./db";
import { initSocket } from "./socket";

import authRoutes from "./routes/auth";
import submissionRoutes from "./routes/submission";
import evaluationRoutes from "./routes/evaluation";
import exportRoutes from "./routes/export";
import adminRoutes from "./routes/admin";

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

initDb();

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "ragathon-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/evaluation", evaluationRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const httpServer = createServer(app);
initSocket(httpServer, CORS_ORIGIN);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`RAGATHON backend listening on port ${PORT}`);
});
