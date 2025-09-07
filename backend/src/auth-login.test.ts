import request from "supertest";
import { app } from "./app";
import { env } from "./env";

describe("POST /auth/login", () => {
  it("retorna 200 e um token válido", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(10);

    // Sanidade: token funciona no /health/secure
    const sec = await request(app)
      .get("/health/secure")
      .set("Authorization", `Bearer ${res.body.token}`);

    expect(sec.status).toBe(200);
    expect(sec.body.user).toMatchObject({
      sub: env.DEMO_USER_ID,
      role: env.DEMO_USER_ROLE,
      email: env.DEMO_USER_EMAIL,
    });
  });

  it("retorna 400 quando o payload é inválido", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "not-an-email", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid payload");
    expect(res.body.issues).toBeDefined();
  });

  it("retorna 401 quando a credencial é inválida", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: env.DEMO_USER_EMAIL, password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });
});
