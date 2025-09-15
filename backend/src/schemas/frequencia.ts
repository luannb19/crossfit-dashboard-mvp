import { z } from "zod";

const asDate = z.coerce.date();

export const frequenciaQuerySchema = z
  .object({
    from: asDate,
    to: asDate,
    groupBy: z.enum(["day", "week", "month"]).default("day"),
    classId: z.string().optional(),
    alunoId: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(366).default(31),
  })
  .refine((v) => v.from <= v.to, {
    message: "`from` deve ser <= `to`",
    path: ["from"],
  });

export type FrequenciaQuery = z.infer<typeof frequenciaQuerySchema>;
