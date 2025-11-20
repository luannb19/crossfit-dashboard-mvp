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

// 👇 novos imports (Stripe)
import webhooksRouter from "./routes/webhooks"; // usa body raw internamente
import billingRouter from "./routes/billing"; // /api/billing/checkout/session (cartão)
import pixRouter from "./routes/pix"; // /api/checkout/pix/session (pix avulso)

export const app = express();
app.use(cors());

// ⚠️ 1) Webhook do Stripe DEVE vir ANTES do express.json(), pois usa RAW body
app.use("/api/webhooks", webhooksRouter);

// ✅ 2) Agora sim, JSON para o resto das rotas
app.use(express.json());

// Rotas públicas
app.use("/health", healthRouter);
app.use("/auth", authRouter);

// Rota protegida
app.use("/frequencia", requireAuth, frequenciaRouter);

// Espelhos com /api (para o frontend)
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/frequencia", requireAuth, frequenciaRouter);

// 🔴 novos endpoints usados pelo frontend (Stripe)
//    → deixei sem requireAuth para simplificar o MVP (Stripe Checkout lida com a sessão segura).
//    → se preferir, podemos colocar requireAuth e o front manda o Bearer token junto.
app.use("/api/billing", billingRouter); // POST /api/billing/checkout/session
app.use("/api/checkout", pixRouter); // POST /api/checkout/pix/session
app.use("/api/admin/billing", adminBillingRouter);

// 🔒 rotas analíticas (protegidas)
app.use("/api", requireAuth, analyticsRouter);

// ✅ Swagger UI em /docs (e o JSON em /docs.json)
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/docs.json", (_req, res) => res.json(swaggerSpec));

if (process.env.NODE_ENV !== "production") {
  const analyticsDevRouter = (await import("./routes/analytics.dev")).default;
  app.use("/api", analyticsDevRouter);
}

export default app;
