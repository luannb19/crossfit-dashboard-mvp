import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./app";

const isPg = (process.env.DATABASE_URL ?? "").startsWith("postgresql://");

describe("GET /health/db", () => {
  it("reports db availability (true on CI Postgres)", async () => {
    const res = await request(app).get("/health/db");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ok", true);
    // Em CI com Postgres, esperamos available: true
    if (isPg) {
      expect(res.body.db?.available).toBe(true);
    }
  });
});
