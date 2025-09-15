import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { frequenciaRouter } from "./routes/frequencia"; // 👈 novo
import { requireAuth } from "./middleware/requireAuth"; // 👈 novo

export const app = express();
app.use(cors());
app.use(express.json());

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/frequencia", frequenciaRouter); // 👈 novo
app.use("/frequencia", requireAuth, frequenciaRouter); // 👈 proteger
