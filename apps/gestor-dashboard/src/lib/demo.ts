// ---------- Helpers ----------
function rng(seed: number) {
  // LCG simples p/ repetibilidade
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

function dateRange(fromISO: string, toISO: string) {
  const out: string[] = [];
  const from = new Date(fromISO + "T00:00:00"); // evita shift de fuso
  const to = new Date(toISO + "T00:00:00");
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    out.push(new Date(d).toISOString().slice(0, 10));
  }
  return out;
}

export function seedFromRange(from: string, to: string) {
  // hash djb2 simples baseado no range, para "fixar" o mock por período
  let h = 5381;
  const s = `${from}|${to}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

function daysBetween(fromISO: string, toISO: string) {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISO + "T00:00:00").getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

// ---------- Heatmap Semana × Hora ----------
export type HeatBin = { weekday: number; hour: number; count: number };

/**
 * Gera mock 7x24 com padrão semanal e picos em horários úteis.
 * @param seedBase número opcional para manter o mock estável
 */
export function demoHeatmapWeekHour(seedBase = 42): HeatBin[] {
  const rnd = rng(seedBase);
  const out: HeatBin[] = [];
  for (let wd = 0; wd < 7; wd++) {
    for (let h = 0; h < 24; h++) {
      // base por dia: fim de semana menor
      const weekdayFactor = wd === 0 || wd === 6 ? 0.6 : 1.0;
      // picos 06–09h e 17–21h
      const morning = h >= 6 && h <= 9 ? 1.0 : 0.2;
      const evening = h >= 17 && h <= 21 ? 1.2 : 0.0;
      const base = 8 * weekdayFactor * (morning + evening + 0.2);
      const noise = (rnd() - 0.5) * 3;
      const v = Math.max(0, Math.round(base + noise));
      out.push({ weekday: wd, hour: h, count: v });
    }
  }
  return out;
}

// ---------- Ranking de Assiduidade ----------
export type RankItem = { memberId: string; nome: string; presencas: number };

const NOMES = [
  "Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gustavo", "Helena", "Igor", "Julia",
  "Karla", "Lucas", "Marina", "Nina", "Otávio", "Paula", "Quintana", "Rafael", "Sofia", "Thiago",
  "Ursula", "Victor", "Will", "Xavier", "Yasmin", "Zeca"
];

/**
 * (Compat) Gera um ranking com presenças em faixa 20–45, s/ relação com o período.
 * Mantido para não quebrar chamadas antigas.
 */
export function demoRankingAssiduidade(qty = 15, seedBase = 99): RankItem[] {
  const rnd = rng(seedBase);
  const items: RankItem[] = [];
  for (let i = 0; i < qty; i++) {
    const nome = NOMES[i % NOMES.length] + (i >= NOMES.length ? ` ${i}` : "");
    const pres = Math.max(1, Math.round(20 + rnd() * 25)); // 20–45
    items.push({ memberId: `m-${i + 1}`, nome, presencas: pres });
  }
  return items.sort((a, b) => b.presencas - a.presencas).slice(0, qty);
}

/**
 * (Novo) Ranking que ESCALA com o período (dias).
 * Use quando quiser refletir 7/28/90/365 no mock.
 */
export function demoRankingAssiduidadeByRange(
  fromISO: string,
  toISO: string,
  qty = 15,
  seedBase = 99
): RankItem[] {
  const rnd = rng(seedBase ^ seedFromRange(fromISO, toISO));
  const days = daysBetween(fromISO, toISO);

  // base "média" de 3 treinos/semana ~ a cada 2,33 dias
  const fator = Math.max(1, Math.round(days / 14)); // 7d≈x1, 28d≈x2, 90d≈x6…

  const items: RankItem[] = [];
  for (let i = 0; i < qty; i++) {
    const nome = NOMES[i % NOMES.length] + (i >= NOMES.length ? ` ${i}` : "");
    // base curta (faixa 4–12) * fator proporcional ao período + ruído leve
    const baseCurta = 4 + Math.floor(rnd() * 9); // 4..12
    const jitter = Math.round((rnd() - 0.5) * 2); // -1..+1
    const pres = Math.max(1, baseCurta * fator + jitter);
    items.push({ memberId: `m-${i + 1}`, nome, presencas: pres });
  }

  return items.sort((a, b) => b.presencas - a.presencas).slice(0, qty);
}

// ---------- Ocupação por Dia ----------
export type DiaPoint = { date: string; presencas: number };

/**
 * Série diária coerente com from/to e com padrão semanal leve.
 */
export function demoOcupacaoDia(fromISO: string, toISO: string, seedBase = 7): DiaPoint[] {
  const days = dateRange(fromISO, toISO);
  const rnd = rng(seedBase ^ seedFromRange(fromISO, toISO));

  return days.map((d, i) => {
    // tendência semanal + ruído
    const wd = new Date(d + "T00:00:00").getDay(); // 0..6
    const weekdayFactor = wd === 0 ? 0.7 : wd === 6 ? 0.9 : 1.0; // dom < sáb < úteis
    const wave = Math.sin(i / 6) * 5; // sazonalidade leve
    const base = 18 * weekdayFactor + wave + (rnd() - 0.5) * 4;
    return { date: d, presencas: Math.max(0, Math.round(base)) };
  });
}
