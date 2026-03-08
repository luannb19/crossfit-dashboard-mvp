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

function getThisWeekRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  const fmt = (d: Date) =>
    d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export default function HomeScreen() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { from, to } = getThisWeekRange();
    const url = `${API_URL}/api/analytics/summary?from=${from}&to=${to}`;
    try {
      const res = await fetch(url);
      const raw = await res.text();
      if (!res.ok) {
        setError(`HTTP ${res.status}: ${raw.slice(0, 80)}`);
        return;
      }
      const data = JSON.parse(raw) as Summary;
      setSummary(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setSummary(null);
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

      {s.busiestDay ? (
        <View style={styles.tip}>
          <Text style={styles.tipTitle}>Dia mais cheio</Text>
          <Text style={styles.tipText}>{s.busiestDay}</Text>
        </View>
      ) : (
        <Text style={styles.emptyHint}>Nenhum dado de presença no período.</Text>
      )}
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
  tip: {
    backgroundColor: "#EEF2FF",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#4F46E5",
  },
  tipTitle: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 4 },
  tipText: { fontSize: 14, color: "#1F2937" },
  emptyHint: { fontSize: 14, color: "#6B7280", fontStyle: "italic" },
});
