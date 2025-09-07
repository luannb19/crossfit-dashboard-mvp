import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "./app"; // seu app exportado de forma nomeada
import { env } from "./env";

const makeToken = () =>
  jwt.sign(
    { sub: "u1", role: "GESTOR", email: "gestor@insightflow.com" },
    env.JWT_SECRET,
    { expiresIn: "1h" },
  );

describe("GET /health/secure (middleware requireAuth)", () => {
  it("retorna 401 sem token", async () => {
    const res = await request(app).get("/health/secure");
    expect(res.status).toBe(401);
  });

  it("retorna 200 com token válido (happy path)", async () => {
    const token = makeToken();
    const res = await request(app)
      .get("/health/secure")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user).toMatchObject({
      sub: "u1",
      role: "GESTOR",
      email: "gestor@insightflow.com",
    });
  });
});
