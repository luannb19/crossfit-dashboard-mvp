// src/frequencia.auth.happy.test.ts
import request from "supertest";
import { app } from "./app";
import { describe, beforeAll, it, expect } from "vitest";

describe("Auth happy path → /frequencia 200", () => {
  let token: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "gestor@insightflow.com", password: "123456" });

    expect(loginRes.status).toBe(200);
    token = loginRes.body?.token;
    expect(token).toBeDefined();
  });

  it("GET /frequencia com Bearer token retorna 200 e (opcionalmente) payload com series/meta", async () => {
    const res = await request(app)
      .get("/frequencia")
      .set("Authorization", `Bearer ${token}`)
      .query({
        from: "2025-01-01",
        to: "2025-01-31",
        groupBy: "day",
        limit: 10,
      });

    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");

    // Suporta { series, meta } ou { data: { series, meta } } — e só valida se existir
    const payload = res.body?.series ? res.body : res.body?.data;

    if (payload) {
      if (payload.series) {
        expect(Array.isArray(payload.series)).toBe(true);
        if (payload.series.length > 0) {
          expect(payload.series[0]).toHaveProperty("date");
          expect(payload.series[0]).toHaveProperty("value");
        }
      }
      if (payload.meta) {
        expect(typeof payload.meta).toBe("object");
      }
    }
  });
});
