import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "./app";

const SECRET = process.env.JWT_SECRET || "dev";

describe("GET /health/secure", () => {
  it("returns 401 without token", async () => {
    const res = await request(app).get("/health/secure");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false, error: "missing_token" });
  });

  it("returns 200 with valid token", async () => {
    const token = jwt.sign({ sub: "user_123", role: "GESTOR" }, SECRET, {
      expiresIn: "5m",
    });
    const res = await request(app)
      .get("/health/secure")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.sub).toBe("user_123");
  });
});
