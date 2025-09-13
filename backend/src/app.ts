import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth"; // +++

export const app = express();
app.use(cors());
app.use(express.json());

app.use("/health", healthRouter);
app.use("/auth", authRouter); // +++
