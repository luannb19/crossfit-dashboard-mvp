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
// Use VITE_API_BASE_URL quando definido; senão, fallback para http://localhost:4000
function apiBase(): string {
  const envBase =
    (import.meta as any)?.env?.VITE_API_BASE_URL ??
    (import.meta as any)?.env?.API_BASE_URL; // backup, se existir
  return envBase && String(envBase).trim().length > 0
    ? String(envBase)
    : "http://localhost:4000";
}

// ===== Helpers: token =====
const TOKEN_KEY = "token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

function authHeader(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  const value = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  return { Authorization: value };
}

// ===== Fetch canônico (JSON) =====
export async function fetchJSON<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  // Content-Type só quando for necessário (POST/PUT/PATCH normalmente)
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  // Aplica Authorization se houver
  const auth = authHeader();
  for (const [k, v] of Object.entries(auth)) {
    if (!headers.has(k)) headers.set(k, v);
  }

  // Prefixa base quando for caminho relativo
  const url = /^https?:\/\//i.test(path) ? path : `${apiBase()}${path}`;

  const res = await fetch(url, { ...init, headers });

  // Tratamento 401 centralizado
  if (res.status === 401) {
    const body = await res.text().catch(() => "");
    // opcional: limpar token para forçar novo login
    // clearToken();
    throw new Error(`HTTP 401: ${body || "Unauthorized — faça login novamente."}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }
  // Se a rota não retornar JSON, devolve null para não quebrar
  return null as unknown as T;
}

// ===== Auth =====
export async function login(email: string, password: string): Promise<string> {
  const body = await fetchJSON<{ token?: string; accessToken?: string; jwt?: string }>(
    `/auth/login`,
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );
  const tok = body?.token ?? body?.accessToken ?? body?.jwt;
  if (!tok) throw new Error("Resposta de login não trouxe token");
  setToken(tok);
  return tok;
}

// (Opcional) obter dev-token direto do front, útil no DevLogin
export async function getDevToken(): Promise<string> {
  const r = await fetchJSON<{ token: string }>(`/api/auth/dev-token`, { method: "POST" });
  const tok = r?.token;
  if (!tok) throw new Error("Falha ao obter dev-token");
  setToken(tok);
  return tok;
}

// ===== Frequência (ocupação por dia/semana/mês) =====
export async function fetchFrequencia(params: {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
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

  return fetchJSON<FrequenciaResponse>(`/api/frequencia?${q.toString()}`);
}

// ===== Ranking de assiduidade =====
export async function fetchRanking(params: { from: string; to: string; limit?: number }) {
  const q = new URLSearchParams();
  q.set("from", params.from);
  q.set("to", params.to);
  if (params.limit != null) q.set("limit", String(params.limit));

  return fetchJSON<RankingResponse>(`/api/assiduidade/ranking?${q.toString()}`);
}

// ===== Heatmap Semana × Hora =====
export async function fetchHeatmap(params: { from: string; to: string }) {
  const q = new URLSearchParams();
  q.set("from", params.from);
  q.set("to", params.to);

  return fetchJSON<HeatmapResponse>(`/api/heatmap/week-hour?${q.toString()}`);
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
