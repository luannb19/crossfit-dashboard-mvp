import request from "supertest";
import { app } from "./app";
import { env } from "./env";

describe("GET /auth/me", () => {
  it("retorna 401 sem token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("retorna 200 com token válido (integração via /auth/login)", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD });

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      sub: env.DEMO_USER_ID,
      role: env.DEMO_USER_ROLE,
      email: env.DEMO_USER_EMAIL,
    });
  });
});
