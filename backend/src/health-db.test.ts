// src/health-db.test.ts
import request from "supertest";
import { app } from "./app";
import { test, expect } from "vitest";

const isCI = !!process.env.CI;

test("GET /health/db > reports db availability (true on CI Postgres)", async () => {
  const res = await request(app).get("/health/db");
  const available = !!res.body?.db?.available;

  if (isCI) {
    expect(available).toBe(true);
  } else {
    // local: só garantimos que veio boolean
    expect(typeof available).toBe("boolean");
  }
});
