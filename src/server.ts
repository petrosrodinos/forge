import "dotenv/config";
import express from "express";
import path from "path";
import chatRouter from "./routes/chat";
import pipelineRouter from "./routes/pipeline";
import imagesRouter from "./routes/images";
import balanceRouter from "./routes/balance";
import { getTripo } from "./services";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/chat", chatRouter);
app.use("/api/tripo/pipeline", pipelineRouter);
app.use("/api/aiml", imagesRouter);
app.use("/api/balance", balanceRouter);

app.get("/api/tripo/task/:id", async (req, res) => {
  try {
    res.json(await getTripo().getTask(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const server = app.listen(PORT, () => {
  console.log(`\n  ⬡  3D Figures — The Forge`);
  console.log(`     http://localhost:${PORT}\n`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n  [server] Port ${PORT} is already in use. Kill the existing process and restart.\n`);
  } else {
    console.error("[server] error:", err);
  }
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("[server] uncaughtException:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandledRejection:", reason);
});
