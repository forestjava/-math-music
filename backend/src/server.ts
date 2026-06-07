import cors from "cors";
import express from "express";
import { apiRouter } from "./routes/api.js";

const PORT = Number(process.env.PORT ?? 3000);

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", apiRouter);

const server = app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    throw new Error(
      `Порт ${PORT} уже занят другим процессом. Остановите его или задайте другой PORT в .env`,
    );
  }

  throw error;
});
