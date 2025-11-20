// src/app.ts
import express from "express";
import cors from "cors";

import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import frequenciaRouter from "./routes/frequencia";
import { requireAuth } from "./middleware/requireAuth";
import analyticsRouter from "./routes/analytics";
import adminBillingRouter from "./routes/admin.billing";

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";

// Stripe
import webhooksRouter from "./routes/webhooks";
import billingRouter from "./routes/billing";
import pixRouter from "./routes/pix";

export const app = express();
app.use(cors());

// 1) Webhook (RAW BODY antes do express.json)
app.use("/api/webhooks", webhooksRouter);

// 2) Agora sim JSON
app.use(express.json());

// rotas públicas
app.use("/health", healthRouter);
app.use("/auth", authRouter);

// rotas privadas
app.use("/frequencia", requireAuth, frequenciaRouter);

// espelhos para /api
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/frequencia", requireAuth, frequenciaRouter);

// Stripe
app.use("/api/billing", billingRouter);
app.use("/api/checkout", pixRouter);
app.use("/api/admin/billing", adminBillingRouter);

// Analytics (protegido)
app.use("/api", requireAuth, analyticsRouter);

// Swagger
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/docs.json", (_req, res) => res.json(swaggerSpec));

// DEV analytics
if (process.env.NODE_ENV !== "production") {
  const analyticsDevRouter = (await import("./routes/analytics.dev")).default;
  app.use("/api", analyticsDevRouter);
}

// 🔥 DEV TOKEN para testes (Vitest usa isso)
import jwt from "jsonwebtoken";
app.get("/dev-token", (_req, res) => {
  const token = jwt.sign(
    { sub: "dev", role: "GESTOR" },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "1d" },
  );
  res.json({ token });
});

export default app;
