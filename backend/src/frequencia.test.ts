import express from "express";
import request from "supertest";
import frequenciaRouter from "./routes/frequencia";

describe("frequenciaRouter (isolado)", () => {
  const app = express();
  app.use(express.json());
  app.use("/frequencia", frequenciaRouter);

  it("retorna série entre as datas com formato estável", async () => {
    const res = await request(app)
      .get("/frequencia")
      .query({ from: "2025-01-01", to: "2025-01-05" }) // 5 dias (inclusivo)
      .expect(200);

    expect(res.body).toHaveProperty("filters");
    expect(res.body.filters.from).toBe("2025-01-01");
    expect(res.body.filters.to).toBe("2025-01-05");

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(5);
    expect(res.body.data[0]).toHaveProperty("date");
    expect(res.body.data[0]).toHaveProperty("presencas");
  });

  it("falha quando from > to", async () => {
    const res = await request(app)
      .get("/frequencia")
      .query({ from: "2025-01-05", to: "2025-01-01" })
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });
});
