// src/types/express.d.ts
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        role: "GESTOR" | "COACH" | "ALUNO";
        email: string;
      };
    }
  }
}

export {};
