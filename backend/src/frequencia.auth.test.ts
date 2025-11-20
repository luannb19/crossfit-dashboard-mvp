import express from "express";
import request from "supertest";
import { requireAuth } from "./middleware/requireAuth";
import frequenciaRouter from "./routes/frequencia";

describe("GET /frequencia protegido por requireAuth", () => {
  const app = express();
  app.use(express.json());
  app.use("/frequencia", requireAuth, frequenciaRouter);

  it("sem Authorization → 401", async () => {
    await request(app)
      .get("/frequencia")
      .query({ from: "2025-01-01", to: "2025-01-05" })
      .expect(401);
  });
});
