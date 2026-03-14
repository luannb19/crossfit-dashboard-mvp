// src/index.ts
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
// import { auth } from "@/lib/auth"; // (opcional aqui)
import analytics from "./routes/analytics";
import frequencia from "./routes/frequencia";
// ❌ removemos o router stub de heatmap para usar o adapter abaixo
// import heatmap from "./routes/heatmap";
import attendance from "./routes/attendance";
// import workouts para criar treinos

import { workoutsRouter } from "./routes/workouts";
import { classesRouter } from "./routes/classes";
import { usersRouter } from "./routes/users";

// fetch nativo do Node 18+
const fetchFn: typeof fetch = globalThis.fetch;

const app = express();
app.use(express.json());

// --- CORS ---
const origins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: origins.length ? origins : true,
    credentials: true,
  }),
);

// --- Health check ---
app.get("/health", (_, res) => res.json({ ok: true }));

// --- Dev token ---
app.get("/dev-token", (_, res) => {
  const token = jwt.sign(
    { sub: "dev", role: "GESTOR" },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" },
  );
  res.json({ token });
});

// --- Rotas principais ---
app.use("/api/analytics", analytics);
app.use("/api/frequencia", frequencia);
app.use("/api/workouts", workoutsRouter);
app.use("/api/classes", classesRouter);
app.use("/api/users", usersRouter);
// ❌ sem router de heatmap aqui; usamos adapter mais abaixo
app.use("/api/attendance", attendance);

// --- Adapter: /api/ocupacao/dia -> /api/analytics/ocupacao-por-dia ---
app.get("/api/ocupacao/dia", async (req, res) => {
  try {
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const r = await fetchFn(
      `http://localhost:${process.env.PORT || 4000}/api/analytics/ocupacao-por-dia${qs}`,
      { headers: { Authorization: req.headers.authorization || "" } },
    );

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).type("text/plain").send(text);
    }

    const base = await r.json();
    const rawSeries =
      base.series ||
      base.data?.series ||
      base.points ||
      base.data?.points ||
      [];

    // ↘️ Novo: garante que % e capacidade sejam incluídos
    const series = Array.isArray(rawSeries)
      ? rawSeries.map((p: Record<string, unknown>) => ({
          date: p.date ?? p.day ?? p.d ?? p.x ?? null,

          // Compatibilidade antiga
          value: p.value ?? p.presencas ?? p.ocupacao ?? 0,
          ocupacao: p.value ?? p.presencas ?? p.ocupacao ?? 0,

          // Novos campos reais
          presencas: p.presencas ?? p.value ?? 0,
          capacidade: p.capacidade ?? 0,
          ocupacaoPercent: p.ocupacaoPercent ?? null,
          ocupacaoRatio: p.ocupacaoRatio ?? null,
        }))
      : [];

    const labels = series.map((p) => p.date);
    const values = series.map((p) => Number(p.value || 0));

    // mantemos compatibilidade com UI antiga
    const items = series.map((s) => ({
      date: s.date,
      presencas: s.presencas,
      capacidade: s.capacidade,
      ocupacaoPercent: s.ocupacaoPercent,
    }));

    const points = series.map((s) => ({
      x: s.date,
      y: s.value,
      ocupacaoPercent: s.ocupacaoPercent,
    }));

    const meta = {
      ...(base.meta || {}),
      ok: true,
      source: base.meta?.source ? `${base.meta.source}+adapter` : "adapter",
    };

    return res.json({
      labels,
      data: values,
      series,
      items,
      points,
      dataset: { label: "Ocupação", labels, data: values },

      // compat
      data: {
        labels,
        values,
        data: values,
        series,
        items,
        rows: items,
        points,
        dataset: { label: "Ocupação", labels, data: values },
      },

      meta,
      meta2: meta,
    });
  } catch (err) {
    console.error("ocupacao/dia adapter error:", err);
    return res.status(500).json({ error: "adapter_failed" });
  }
});

// --- Alias pt-BR de assiduidade -> usa a rota REAL do analytics ---
app.get("/api/assiduidade/ranking", (req, res) => {
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(307, `/api/analytics/assiduidade/ranking${qs}`);
});

// --- Adapter: heatmap (bins 7x24) -> consulta analytics ---
app.get("/api/heatmap/week-hour", async (req, res) => {
  try {
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const r = await fetchFn(
      `http://localhost:${process.env.PORT || 4000}/api/analytics/heatmap/week-hour${qs}`,
      { headers: { Authorization: req.headers.authorization || "" } },
    );

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).type("text/plain").send(text);
    }

    const base = await r.json();
    // Esperado do analytics: base.data = [{ weekday: 0..6 (0=Dom), hour: 0..23, count }]
    const rows: Array<{ weekday: number; hour: number; count: number }> =
      Array.isArray(base?.data) ? base.data : [];

    // bins[7][24] inicializado com 0
    const bins: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const it of rows) {
      const wd = Math.max(0, Math.min(6, Number(it.weekday)));
      const hr = Math.max(0, Math.min(23, Number(it.hour)));
      bins[wd][hr] = Number(it.count || 0);
    }

    // aliases para máxima compatibilidade com o front
    const flat = bins.flat();
    const max = flat.length ? Math.max(...flat) : 0;
    const min = flat.length ? Math.min(...flat) : 0;

    return res.json({
      // formato “aninhado” comum
      data: { bins, values: flat, rows: bins },

      // formatos “top-level” que alguns componentes esperam
      bins,
      values: flat,
      rows: bins,

      // alguns UIs leem max/min no meta
      meta: {
        ...(base.meta || {}),
        min,
        max,
        source: base.meta?.source ? `${base.meta.source}+adapter` : "adapter",
      },
    });
  } catch (err: unknown) {
    console.error("heatmap adapter error:", err);
    const bins = Array.from({ length: 7 }, () => Array(24).fill(0));
    return res.json({
      data: { bins },
      bins,
      values: bins.flat(),
      rows: bins,
      meta: { source: "adapter_error", min: 0, max: 0 },
    });
  }
});

// --- Start ---
const port = Number(process.env.PORT || 4000);
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Backend rodando em http://0.0.0.0:${port}`);
});
