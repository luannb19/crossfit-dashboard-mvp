import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";

export type AppRole = "GESTOR" | "COACH" | "ALUNO";

type JwtPayload = {
  sub?: string; // padrão JWT
  id?: string; // fallback para tokens antigos
  role: AppRole;
  email: string;
  iat?: number;
  exp?: number;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or malformed Authorization header" });
  }

  const token = header.slice(7).trim();

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const userId = decoded.sub ?? decoded.id;
  if (!userId) {
    return res.status(401).json({ error: "Invalid token payload" });
  }

  // Assume que ../types/express.d.ts define Request['user'] = { sub: string; role: AppRole; email: string }
  req.user = {
    sub: userId,
    role: decoded.role,
    email: decoded.email,
  } as Request["user"];

  return next();
}
