import { useCallback, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "@/config/api";

type Summary = {
  period: { from: string; to: string };
  occupancyPercent: number;
  totalCheckIns: number;
  totalCapacity: number;
  memberCount: number;
  busiestDay: string | null;
};

type OccupancyCell = {
  dayOfWeek: number;
  hour: number;
  checkins: number;
  capacity: number;
  occupancyPercent: number;
};

type MemberRankItem = {
  userId: string;
  name: string;
  checkinCount: number;
};

function getThisWeekRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  const fmt = (d: Date) =>
    d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HEATMAP_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

export default function HomeScreen() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [heatmap, setHeatmap] = useState<OccupancyCell[]>([]);
  const [memberRanking, setMemberRanking] = useState<MemberRankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { from, to } = getThisWeekRange();
    try {
      const [summaryRes, heatmapRes, rankingRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/summary?from=${from}&to=${to}`),
        fetch(`${API_URL}/api/analytics/occupancy-heatmap?from=${from}&to=${to}`),
        fetch(`${API_URL}/api/analytics/member-ranking?from=${from}&to=${to}`),
      ]);
      const summaryRaw = await summaryRes.text();
      if (!summaryRes.ok) {
        setError(`HTTP ${summaryRes.status}: ${summaryRaw.slice(0, 80)}`);
        return;
      }
      setSummary(JSON.parse(summaryRaw) as Summary);
      const heatmapJson = await heatmapRes.json().catch(() => ({}));
      setHeatmap(Array.isArray(heatmapJson?.data) ? heatmapJson.data : []);
      const rankingJson = await rankingRes.json().catch(() => ({}));
      setMemberRanking(Array.isArray(rankingJson?.data) ? rankingJson.data : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setSummary(null);
      setHeatmap([]);
      setMemberRanking([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  if (loading && !summary) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Carregando resumo…</Text>
      </View>
    );
  }

  if (error && !summary) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.hint}>Verifique a conexão com o backend.</Text>
      </View>
    );
  }

  const s = summary!;
  const periodLabel = `${s.period.from} → ${s.period.to}`;

  // Occupancy alert: low / ok / high
  const occupancyAlert =
    s.totalCapacity > 0
      ? s.occupancyPercent < 30
        ? { type: "low" as const, text: "Ocupação baixa esta semana. Considere promoções ou divulgar novos horários." }
      : s.occupancyPercent >= 75
        ? { type: "high" as const, text: "Ótima ocupação esta semana!" }
        : null
      : null;

  // Underused slot: lowest occupancy with some capacity (exclude zero-capacity)
  const slotsWithCapacity = heatmap.filter((c) => (c.capacity ?? 0) > 0);
  const underusedSlot =
    slotsWithCapacity.length > 0
      ? slotsWithCapacity.reduce((a, b) =>
          (a.occupancyPercent ?? 99) <= (b.occupancyPercent ?? 99) ? a : b
        )
      : null;
  const underusedLabel =
    underusedSlot &&
    underusedSlot.occupancyPercent < 50 &&
    underusedSlot.capacity > 0
      ? `${WEEKDAYS[underusedSlot.dayOfWeek]} ${underusedSlot.hour}h (${underusedSlot.occupancyPercent}% ocupação)`
      : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadSummary} />
      }
    >
      <Text style={styles.title}>Resumo da semana</Text>
      <Text style={styles.period}>{periodLabel}</Text>

      {/* Summary metrics */}
      <View style={styles.cards}>
        <View style={styles.card}>
          <Text style={styles.value}>{s.occupancyPercent}%</Text>
          <Text style={styles.label}>Ocupação</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.value}>{s.totalCheckIns}</Text>
          <Text style={styles.label}>Check-ins</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.value}>{s.memberCount}</Text>
          <Text style={styles.label}>Alunos ativos</Text>
        </View>
      </View>

      {/* Occupancy alert */}
      {occupancyAlert && (
        <View
          style={[
            styles.alert,
            occupancyAlert.type === "low"
              ? styles.alertWarning
              : styles.alertSuccess,
          ]}
        >
          <Text style={styles.alertText}>{occupancyAlert.text}</Text>
        </View>
      )}

      {/* Busiest day insight */}
      {s.busiestDay ? (
        <View style={styles.insight}>
          <Text style={styles.insightTitle}>Dia mais cheio</Text>
          <Text style={styles.insightText}>
            {s.busiestDay} — aproveite para divulgar ou abrir mais turmas nesse dia.
          </Text>
        </View>
      ) : (
        !occupancyAlert && (
          <Text style={styles.emptyHint}>Nenhum dado de presença no período.</Text>
        )
      )}

      {/* Underused slot suggestion */}
      {underusedLabel && (
        <View style={styles.insight}>
          <Text style={styles.insightTitle}>Horário subutilizado</Text>
          <Text style={styles.insightText}>
            {underusedLabel}. Considere divulgar ou realocar aulas.
          </Text>
        </View>
      )}

      {/* Mais presentes da semana */}
      <View style={styles.rankingSection}>
        <Text style={styles.rankingTitle}>Mais presentes da semana</Text>
        {memberRanking.length === 0 ? (
          <Text style={styles.rankingEmpty}>Nenhum check-in no período.</Text>
        ) : (
          memberRanking.map((item, i) => (
            <View key={item.userId} style={styles.rankingRow}>
              <Text style={styles.rankingPos}>{i + 1}º</Text>
              <Text style={styles.rankingName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.rankingCount}>
                {item.checkinCount} {item.checkinCount === 1 ? "check-in" : "check-ins"}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Occupancy heatmap (simplified): 7 days × 12 hours */}
      <View style={styles.heatmapSection}>
        <Text style={styles.heatmapTitle}>Ocupação por dia e hora</Text>
        <View style={styles.heatmapGrid}>
          <View style={styles.heatmapRow}>
            <View style={styles.heatmapCorner} />
            {HEATMAP_HOURS.map((h) => (
              <Text key={h} style={styles.heatmapHeader} numberOfLines={1}>
                {h}h
              </Text>
            ))}
          </View>
          {WEEKDAYS.map((_, dow) => (
            <View key={dow} style={styles.heatmapRow}>
              <Text style={styles.heatmapRowLabel} numberOfLines={1}>
                {WEEKDAYS[dow]}
              </Text>
              {HEATMAP_HOURS.map((hour) => {
                const cell = heatmap.find(
                  (c) => c.dayOfWeek === dow && c.hour === hour
                );
                const pct = cell?.occupancyPercent ?? 0;
                const maxPct = Math.max(
                  1,
                  ...heatmap.map((c) => c.occupancyPercent)
                );
                const intensity = maxPct > 0 ? pct / maxPct : 0;
                const lightness = 92 - Math.round(intensity * 50);
                const bg = cell?.capacity
                  ? `hsl(220, 60%, ${lightness}%)`
                  : "#F3F4F6";
                return (
                  <View
                    key={`${dow}-${hour}`}
                    style={[styles.heatmapCell, { backgroundColor: bg }]}
                  />
                );
              })}
            </View>
          ))}
        </View>
        <Text style={styles.heatmapLegend}>0% → mais cheio</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  content: { padding: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingText: { marginTop: 10, color: "#6B7280" },
  errorText: { color: "#DC2626", textAlign: "center" },
  hint: { marginTop: 8, fontSize: 12, color: "#6B7280" },
  title: { fontSize: 20, fontWeight: "bold", color: "#111", marginBottom: 4 },
  period: { fontSize: 12, color: "#6B7280", marginBottom: 16 },
  cards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    minWidth: 90,
    backgroundColor: "#F3F4F6",
    padding: 14,
    borderRadius: 10,
  },
  value: { fontSize: 22, fontWeight: "bold", color: "#4F46E5" },
  label: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  alert: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  alertWarning: {
    backgroundColor: "#FEF3C7",
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  alertSuccess: {
    backgroundColor: "#D1FAE5",
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  alertText: { fontSize: 14, color: "#1F2937", fontWeight: "500" },
  insight: {
    backgroundColor: "#EEF2FF",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#4F46E5",
    marginBottom: 12,
  },
  insightTitle: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 4 },
  insightText: { fontSize: 14, color: "#1F2937" },
  emptyHint: { fontSize: 14, color: "#6B7280", fontStyle: "italic", marginBottom: 12 },
  rankingSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
  },
  rankingTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 10 },
  rankingEmpty: { fontSize: 13, color: "#6B7280" },
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  rankingPos: { fontSize: 12, color: "#6B7280", width: 28, fontWeight: "500" },
  rankingName: { flex: 1, fontSize: 14, color: "#111", marginRight: 8 },
  rankingCount: { fontSize: 12, color: "#4F46E5", fontWeight: "600" },
  heatmapSection: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
  },
  heatmapTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  heatmapGrid: { gap: 2 },
  heatmapRow: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 2 },
  heatmapCorner: { width: 28, height: 18 },
  heatmapHeader: {
    width: 20,
    fontSize: 9,
    color: "#6B7280",
    textAlign: "center",
  },
  heatmapRowLabel: {
    width: 28,
    fontSize: 10,
    color: "#374151",
    fontWeight: "500",
  },
  heatmapCell: { width: 20, height: 18, borderRadius: 2 },
  heatmapLegend: { fontSize: 10, color: "#6B7280", marginTop: 6 },
});
