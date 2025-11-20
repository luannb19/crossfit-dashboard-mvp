import request from "supertest";
import app from "./app"; // ou onde está o express

describe("frequenciaRouter (isolado)", () => {
  let token: string;

  beforeAll(async () => {
    const r = await request(app).get("/dev-token").expect(200);
    token = r.body.token;
  });

  test("retorna série entre as datas com formato estável", async () => {
    const res = await request(app)
      .get("/frequencia")
      .set("Authorization", `Bearer ${token}`)
      .query({ from: "2025-01-01", to: "2025-01-05" })
      .expect(200);

    expect(res.body).toHaveProperty("filters");
    expect(res.body).toHaveProperty("data");
  });

  test("falha quando from > to", async () => {
    const res = await request(app)
      .get("/frequencia")
      .set("Authorization", `Bearer ${token}`)
      .query({ from: "2025-01-05", to: "2025-01-01" })
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });
});
