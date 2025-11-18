// src/middleware/auth.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { requireAuth } from "./requireAuth";
import type { AppRole } from "./requireAuth";

/**
 * Adapter compatível com rotas que usam:
 *  - auth(["GESTOR","COACH"])  // export nomeado
 *  - default import auth from "../middleware/auth"
 *
 * 1) Autentica via requireAuth
 * 2) (Opcional) Se roles forem passadas, valida autorização
 */
function auth(roles?: AppRole[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Primeiro autentica
    requireAuth(req, res, () => {
      // Depois autoriza (se roles foram informadas)
      if (roles && roles.length > 0) {
        const userRole = (req.user as { role?: AppRole } | undefined)?.role;
        if (!userRole || !roles.includes(userRole)) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
      return next();
    });
  };
}

export default auth;
export { auth }; // <- também exporta como nomeado para compatibilidade
