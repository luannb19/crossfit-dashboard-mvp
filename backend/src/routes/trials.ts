import { Router } from "express";
import { prisma } from "../lib/prisma";
import { LeadSource } from "@prisma/client";

const LEAD_SOURCES: LeadSource[] = [
  "INSTAGRAM",
  "FACEBOOK",
  "INDICATION",
  "WEBSITE",
  "WALK_IN",
  "GOOGLE",
  "OTHER",
];

function parseLeadSource(val: unknown): LeadSource | null {
  if (typeof val !== "string") return null;
  const u = val.toUpperCase();
  return LEAD_SOURCES.includes(u as LeadSource) ? (u as LeadSource) : null;
}

export const trialsRouter = Router();

// POST /api/trials
trialsRouter.post("/", async (req, res) => {
  try {
    const {
      boxId,
      name,
      email,
      phone,
      leadSource,
      trialClassId,
      coachId,
      notes,
    } = req.body as {
      boxId?: string;
      name?: string;
      email?: string;
      phone?: string;
      leadSource?: string;
      trialClassId?: string;
      coachId?: string;
      notes?: string;
    };
    if (!boxId || !name || !email || !trialClassId || !coachId) {
      return res.status(400).json({
        error: "boxId, name, email, trialClassId e coachId são obrigatórios",
      });
    }
    const source = parseLeadSource(leadSource);
    if (!source) {
      return res.status(400).json({
        error:
          "leadSource inválido. Use: INSTAGRAM, FACEBOOK, INDICATION, WEBSITE, WALK_IN, GOOGLE, OTHER",
      });
    }
    const [cls, coach] = await Promise.all([
      prisma.class.findUnique({ where: { id: trialClassId } }),
      prisma.user.findUnique({ where: { id: coachId } }),
    ]);
    if (!cls) {
      return res
        .status(400)
        .json({ error: "Aula (trialClassId) não encontrada" });
    }
    if (!coach || (coach.role !== "COACH" && coach.role !== "GESTOR")) {
      return res
        .status(400)
        .json({
          error: "Coach (coachId) não encontrado ou não é COACH/GESTOR",
        });
    }
    const trial = await prisma.trialSignup.create({
      data: {
        boxId: String(boxId),
        name: String(name).trim(),
        email: String(email).trim(),
        phone:
          phone != null && String(phone).trim() !== ""
            ? String(phone).trim()
            : null,
        leadSource: source,
        trialClassId,
        coachId,
        notes:
          notes != null && String(notes).trim() !== ""
            ? String(notes).trim()
            : null,
      },
      include: {
        trialClass: {
          select: { id: true, title: true, startAt: true, endAt: true },
        },
        coach: { select: { id: true, name: true, email: true } },
      },
    });
    return res.status(201).json(trial);
  } catch (err) {
    console.error("POST /api/trials error:", err);
    return res.status(500).json({ error: "Erro ao criar trial" });
  }
});

// GET /api/trials?boxId= & from= & to= & converted= & leadSource= & coachId=
trialsRouter.get("/", async (req, res) => {
  try {
    const { boxId, from, to, converted, leadSource, coachId } = req.query;
    if (!boxId || typeof boxId !== "string") {
      return res.status(400).json({ error: "boxId é obrigatório" });
    }
    const where: {
      boxId: string;
      signedUpAt?: { gte?: Date; lte?: Date };
      convertedAt?: null | { not: null };
      leadSource?: LeadSource;
      coachId?: string;
    } = { boxId };
    if (from && typeof from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      where.signedUpAt = {
        ...where.signedUpAt,
        gte: new Date(from + "T00:00:00.000Z"),
      };
    }
    if (to && typeof to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      const end = new Date(to + "T00:00:00.000Z");
      end.setUTCHours(23, 59, 59, 999);
      where.signedUpAt = { ...where.signedUpAt, lte: end };
    }
    if (converted === "true") {
      where.convertedAt = { not: null };
    } else if (converted === "false") {
      where.convertedAt = null;
    }
    const src = parseLeadSource(leadSource);
    if (src) where.leadSource = src;
    if (coachId && typeof coachId === "string") where.coachId = coachId;

    const list = await prisma.trialSignup.findMany({
      where,
      orderBy: [{ signedUpAt: "desc" }],
      include: {
        trialClass: {
          select: { id: true, title: true, startAt: true, endAt: true },
        },
        coach: { select: { id: true, name: true, email: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return res.json(list);
  } catch (err) {
    console.error("GET /api/trials error:", err);
    return res.status(500).json({ error: "Erro ao listar trials" });
  }
});

// GET /api/trials/:id
trialsRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const trial = await prisma.trialSignup.findUnique({
      where: { id },
      include: {
        trialClass: {
          select: { id: true, title: true, startAt: true, endAt: true },
        },
        coach: { select: { id: true, name: true, email: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!trial) {
      return res.status(404).json({ error: "Trial não encontrado" });
    }
    return res.json(trial);
  } catch (err) {
    console.error("GET /api/trials/:id error:", err);
    return res.status(500).json({ error: "Erro ao buscar trial" });
  }
});

// PATCH /api/trials/:id
trialsRouter.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.trialSignup.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Trial não encontrado" });
    }
    const { name, email, phone, leadSource, notes, trialClassId, coachId } =
      req.body as {
        name?: string;
        email?: string;
        phone?: string;
        leadSource?: string;
        notes?: string;
        trialClassId?: string;
        coachId?: string;
      };
    const data: {
      name?: string;
      email?: string;
      phone?: string | null;
      leadSource?: LeadSource;
      notes?: string | null;
      trialClassId?: string;
      coachId?: string;
    } = {};
    if (name != null) data.name = String(name).trim();
    if (email != null) data.email = String(email).trim();
    if (phone !== undefined)
      data.phone =
        phone != null && String(phone).trim() !== ""
          ? String(phone).trim()
          : null;
    if (notes !== undefined)
      data.notes =
        notes != null && String(notes).trim() !== ""
          ? String(notes).trim()
          : null;
    const src = leadSource != null ? parseLeadSource(leadSource) : null;
    if (src) data.leadSource = src;
    if (trialClassId != null) {
      const cls = await prisma.class.findUnique({
        where: { id: trialClassId },
      });
      if (!cls)
        return res
          .status(400)
          .json({ error: "Aula (trialClassId) não encontrada" });
      data.trialClassId = trialClassId;
    }
    if (coachId != null) {
      const coach = await prisma.user.findUnique({ where: { id: coachId } });
      if (!coach || (coach.role !== "COACH" && coach.role !== "GESTOR")) {
        return res
          .status(400)
          .json({
            error: "Coach (coachId) não encontrado ou não é COACH/GESTOR",
          });
      }
      data.coachId = coachId;
    }
    const trial = await prisma.trialSignup.update({
      where: { id },
      data,
      include: {
        trialClass: {
          select: { id: true, title: true, startAt: true, endAt: true },
        },
        coach: { select: { id: true, name: true, email: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return res.json(trial);
  } catch (err) {
    console.error("PATCH /api/trials/:id error:", err);
    return res.status(500).json({ error: "Erro ao atualizar trial" });
  }
});

// POST /api/trials/:id/convert
trialsRouter.post("/:id/convert", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: linkUserId } = req.body as { userId?: string };
    const existing = await prisma.trialSignup.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Trial não encontrado" });
    }
    if (existing.convertedAt) {
      return res.status(400).json({ error: "Trial já convertido" });
    }
    let convertedBy: string | null = null;
    const authSub = (req as { user?: { sub?: unknown } }).user?.sub;
    if (typeof authSub === "string") convertedBy = authSub;
    if (linkUserId != null && typeof linkUserId === "string") {
      const u = await prisma.user.findUnique({ where: { id: linkUserId } });
      if (!u)
        return res
          .status(400)
          .json({ error: "userId (vínculo) não encontrado" });
    }
    const trial = await prisma.trialSignup.update({
      where: { id },
      data: {
        convertedAt: new Date(),
        convertedBy: convertedBy ?? undefined,
        userId:
          linkUserId != null && String(linkUserId).trim() !== ""
            ? String(linkUserId).trim()
            : undefined,
      },
      include: {
        trialClass: {
          select: { id: true, title: true, startAt: true, endAt: true },
        },
        coach: { select: { id: true, name: true, email: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return res.json(trial);
  } catch (err) {
    console.error("POST /api/trials/:id/convert error:", err);
    return res.status(500).json({ error: "Erro ao converter trial" });
  }
});
