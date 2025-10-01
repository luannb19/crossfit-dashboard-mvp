// apps/gestor-dashboard/src/lib/api.ts

// ===== Tipos =====
export type GroupBy = "day" | "week" | "month";

export type FrequenciaPoint = { date: string; presencas: number };
export type FrequenciaResponse = {
  filters: {
    from: string;
    to: string;
    groupBy: GroupBy;
    classId: string | null;
    alunoId: string | null;
    limit: number;
  };
  data: FrequenciaPoint[];
  meta: { source: "demo" | "db"; count: number };
};

export type RankingItem = { alunoId: string; presencas: number; nome?: string };
export type RankingResponse = {
  period: { from: string; to: string };
  data: RankingItem[];
};

export type HeatmapBin = { dow: number; hour: number; presencas: number };
export type HeatmapResponse = {
  period: { from: string; to: string };
  data: HeatmapBin[];
};

// ===== Config =====
// Em dev, deixe VITE_API_BASE_URL vazio para usar o proxy do Vite.
// Se preencher (ex.: http://localhost:4000), as chamadas vão direto ao backend.
const API_BASE: string = (import.meta as any)?.env?.VITE_API_BASE_URL ?? "";

// ===== Helpers: token =====
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}
export function setToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem("token", token);
}
export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("token");
}
function authHeader(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  const value = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  return { Authorization: value };
}

// ===== Fetch canônico (JSON) =====
export async function fetchJSON<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  // Define Content-Type apenas se o chamador não definiu
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  // Aplica Authorization se houver
  const auth = authHeader();
  Object.entries(auth).forEach(([k, v]) => {
    if (!headers.has(k)) headers.set(k, v);
  });

  const res = await fetch(url, { ...init, headers });

  // Tratamento centralizado de 401
  if (res.status === 401) {
    clearToken();
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP 401: ${body || "Unauthorized — faça login novamente."}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  // As rotas deste arquivo retornam JSON
  return res.json() as Promise<T>;
}

// ===== Auth =====
export async function login(email: string, password: string): Promise<string> {
  const base = API_BASE || ""; // com proxy do Vite, mantém vazio
  const body = await fetchJSON<{ token?: string; accessToken?: string; jwt?: string }>(
    `${base}/auth/login`,
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );
  const tok = body.token ?? body.accessToken ?? body.jwt;
  if (!tok) throw new Error("Resposta de login não trouxe token");
  setToken(tok);
  return tok;
}

// ===== Frequência (ocupação por dia/semana/mês) =====
export async function fetchFrequencia(params: {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  groupBy?: GroupBy;
  classId?: string;
  alunoId?: string;
  limit?: number;
}) {
  const q = new URLSearchParams();
  q.set("from", params.from);
  q.set("to", params.to);
  q.set("groupBy", params.groupBy ?? "day");
  if (params.classId) q.set("classId", params.classId);
  if (params.alunoId) q.set("alunoId", params.alunoId);
  if (params.limit != null) q.set("limit", String(params.limit));

  const base = API_BASE || "";
  return fetchJSON<FrequenciaResponse>(`${base}/api/frequencia?${q.toString()}`);
}

// ===== Ranking de assiduidade =====
export async function fetchRanking(params: { from: string; to: string; limit?: number }) {
  const q = new URLSearchParams();
  q.set("from", params.from);
  q.set("to", params.to);
  if (params.limit != null) q.set("limit", String(params.limit));

  const base = API_BASE || "";
  return fetchJSON<RankingResponse>(`${base}/api/assiduidade/ranking?${q.toString()}`);
}

// ===== Heatmap Semana × Hora =====
export async function fetchHeatmap(params: { from: string; to: string }) {
  const q = new URLSearchParams();
  q.set("from", params.from);
  q.set("to", params.to);

  const base = API_BASE || "";
  return fetchJSON<HeatmapResponse>(`${base}/api/heatmap/week-hour?${q.toString()}`);
}

// ===== Util: período padrão (últimos N dias) =====
export function getDefaultRange(days = 28): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { from: fmt(from), to: fmt(to) };
}
