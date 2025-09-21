// backend/src/schemas/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(1).trim(),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8),
  role: z.enum(["GESTOR", "COACH", "ALUNO"]),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// Útil se quiser referenciar o literal de role em outros lugares
export type RoleLiteral = RegisterInput["role"];
