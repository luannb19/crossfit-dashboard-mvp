/**
 * Workout import: parse CSV/XLSX and validate rows.
 * Upsert key: (boxId, date (day), title, category).
 */

import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { WorkoutCategory } from "@prisma/client";

const CATEGORIES = new Set<string>(
  (["METCON", "STRENGTH", "TECHNIQUE", "MOBILITY"] as const).map((c) =>
    c.toUpperCase(),
  ),
);

const DESCRIPTION_MAX = 2000;

export type ParsedRow = {
  rowIndex: number;
  date: string;
  title: string;
  category: string;
  description?: string;
  videoUrl?: string;
  errors: string[];
};

function normalizeHeader(h: string): string {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

const COL_MAP: Record<string, string> = {
  date: "date",
  data: "date",
  title: "title",
  titulo: "title",
  category: "category",
  categoria: "category",
  description: "description",
  descricao: "description",
  videourl: "videoUrl",
  video: "videoUrl",
};

function mapRow(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = COL_MAP[normalizeHeader(k)] ?? normalizeHeader(k);
    if (key && v != null && String(v).trim() !== "") {
      out[key] = String(v).trim();
    }
  }
  return out;
}

function parseDate(val: string): Date | null {
  const s = String(val || "").trim();
  if (!s) return null;
  // YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const d = new Date(
      parseInt(iso[1], 10),
      parseInt(iso[2], 10) - 1,
      parseInt(iso[3], 10),
    );
    return isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (dmy) {
    const d = new Date(
      parseInt(dmy[3], 10),
      parseInt(dmy[2], 10) - 1,
      parseInt(dmy[1], 10),
    );
    return isNaN(d.getTime()) ? null : d;
  }
  const any = new Date(s);
  return isNaN(any.getTime()) ? null : any;
}

function dateToYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function validateRow(m: Record<string, string>, rowIndex: number): ParsedRow {
  const errors: string[] = [];
  let dateStr = "";
  const title = (m.title ?? "").trim();
  const categoryRaw = (m.category ?? "").trim().toUpperCase();
  const description = m.description?.trim();
  const videoUrl = m.videoUrl?.trim();

  const date = parseDate(m.date ?? "");
  if (!date) {
    errors.push("Data inválida ou ausente");
  } else {
    dateStr = dateToYYYYMMDD(date);
  }

  if (!title) errors.push("Título obrigatório");
  if (!categoryRaw) {
    errors.push("Categoria obrigatória");
  } else if (!CATEGORIES.has(categoryRaw)) {
    errors.push(
      `Categoria deve ser uma de: METCON, STRENGTH, TECHNIQUE, MOBILITY`,
    );
  }
  if (description != null && description.length > DESCRIPTION_MAX) {
    errors.push(`Descrição com no máximo ${DESCRIPTION_MAX} caracteres`);
  }
  if (videoUrl != null && videoUrl.length > 0) {
    try {
      new URL(videoUrl);
    } catch {
      errors.push("videoUrl inválido");
    }
  }

  return {
    rowIndex,
    date: dateStr,
    title,
    category: CATEGORIES.has(categoryRaw) ? categoryRaw : categoryRaw || "",
    description: description || undefined,
    videoUrl: videoUrl || undefined,
    errors,
  };
}

export function parseCSV(buffer: Buffer): ParsedRow[] {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, unknown>[];

  const out: ParsedRow[] = [];
  for (let i = 0; i < records.length; i++) {
    const mapped = mapRow(records[i]);
    if (Object.keys(mapped).length === 0) continue;
    out.push(validateRow(mapped, i + 1));
  }
  return out;
}

export function parseXLSX(buffer: Buffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const sheet = wb.Sheets[first];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  const out: ParsedRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const mapped = mapRow(rows[i]);
    if (Object.keys(mapped).length === 0) continue;
    out.push(validateRow(mapped, i + 1));
  }
  return out;
}

export function parseFile(
  buffer: Buffer,
  filename: string,
): { rows: ParsedRow[]; error?: string } {
  const lower = (filename || "").toLowerCase();
  if (lower.endsWith(".csv")) {
    try {
      return { rows: parseCSV(buffer) };
    } catch (e) {
      return { rows: [], error: `CSV inválido: ${(e as Error).message}` };
    }
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    try {
      return { rows: parseXLSX(buffer) };
    } catch (e) {
      return { rows: [], error: `Planilha inválida: ${(e as Error).message}` };
    }
  }
  return {
    rows: [],
    error: "Formato não suportado. Use .csv ou .xlsx",
  };
}

export function isRowValid(row: ParsedRow): boolean {
  return row.errors.length === 0;
}

export function toWorkoutCategory(category: string): WorkoutCategory {
  const c = category.toUpperCase();
  if (CATEGORIES.has(c)) return c as WorkoutCategory;
  return "METCON";
}

export type ImportPreviewResponse = {
  ok: true;
  fileName: string;
  rowCount: number;
  rows: Array<{
    rowIndex: number;
    date: string;
    title: string;
    category: string;
    description?: string;
    videoUrl?: string;
    errors?: string[];
    /** Present when preview was requested with boxId: true if a workout exists for (boxId, date, title, category). */
    existing?: boolean;
  }>;
  summary: { valid: number; invalid: number };
};

export function buildPreviewResponse(
  fileName: string,
  rows: (ParsedRow & { existing?: boolean })[],
  _boxId?: string,
): ImportPreviewResponse {
  const list = rows.map((r) => ({
    rowIndex: r.rowIndex,
    date: r.date,
    title: r.title,
    category: r.category,
    description: r.description,
    videoUrl: r.videoUrl,
    ...(r.errors.length > 0 ? { errors: r.errors } : {}),
    ...(r.existing !== undefined ? { existing: r.existing } : {}),
  }));
  const valid = rows.filter((r) => r.errors.length === 0).length;
  return {
    ok: true,
    fileName,
    rowCount: rows.length,
    rows: list,
    summary: { valid, invalid: rows.length - valid },
  };
}

/** Payload row as sent by client to POST /import. */
export type ImportRowPayload = {
  rowIndex?: number;
  date: string;
  title: string;
  category: string;
  description?: string;
  videoUrl?: string;
};

/** Re-validate a row from JSON body; returns list of errors (empty if valid). */
export function validateImportRow(row: unknown): string[] {
  if (row == null || typeof row !== "object") return ["Linha inválida"];
  const r = row as Record<string, unknown>;
  const errors: string[] = [];
  const date = parseDate(String(r.date ?? ""));
  if (!date) errors.push("Data inválida ou ausente");
  const title = String(r.title ?? "").trim();
  if (!title) errors.push("Título obrigatório");
  const cat = String(r.category ?? "")
    .trim()
    .toUpperCase();
  if (!cat) errors.push("Categoria obrigatória");
  else if (!CATEGORIES.has(cat))
    errors.push("Categoria deve ser METCON, STRENGTH, TECHNIQUE ou MOBILITY");
  const desc = r.description != null ? String(r.description) : "";
  if (desc.length > DESCRIPTION_MAX)
    errors.push(`Descrição com no máximo ${DESCRIPTION_MAX} caracteres`);
  const url = r.videoUrl != null ? String(r.videoUrl).trim() : "";
  if (url) {
    try {
      new URL(url);
    } catch {
      errors.push("videoUrl inválido");
    }
  }
  return errors;
}

export function normalizeImportRow(row: ImportRowPayload): {
  date: string;
  title: string;
  category: string;
  description?: string;
  videoUrl?: string;
} {
  const date = parseDate(String(row.date ?? ""));
  const dateStr = date ? dateToYYYYMMDD(date) : "";
  const cat = String(row.category ?? "")
    .trim()
    .toUpperCase();
  return {
    date: dateStr,
    title: String(row.title ?? "").trim(),
    category: CATEGORIES.has(cat) ? cat : cat || "METCON",
    description: row.description?.trim() || undefined,
    videoUrl: row.videoUrl?.trim() || undefined,
  };
}
