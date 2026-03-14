import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "@/config/api";

type Workout = {
  id: string;
  boxId: string;
  date: string;
  title: string;
  description?: string;
  category: string;
};

export default function TreinosScreen({ navigation }: any) {
  const [treinos, setTreinos] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiUrlUsed, setApiUrlUsed] = useState<string>("");
  const [healthCheckResult, setHealthCheckResult] = useState<string>("");

  async function loadTreinos() {
    setLoading(true);
    setError(null);
    setApiUrlUsed(API_URL);
    setHealthCheckResult("…");

    const requestUrl = `${API_URL}/api/workouts?from=2025-01-01&to=2025-12-31&boxId=superforce`;
    console.log("[TreinosScreen] API_URL:", API_URL);
    console.log("[TreinosScreen] GET request URL:", requestUrl);

    // Temporary connectivity test: fetch /health and show exact result on screen
    try {
      const healthRes = await fetch(`${API_URL}/health`);
      const healthBody = await healthRes.text();
      const healthSummary = `status ${healthRes.status} body ${healthBody.slice(0, 80)}${healthBody.length > 80 ? "…" : ""}`;
      setHealthCheckResult(healthSummary);
      console.log("[TreinosScreen] /health result:", healthSummary);
    } catch (healthErr) {
      const msg = healthErr instanceof Error ? healthErr.message : String(healthErr);
      setHealthCheckResult(`network error: ${msg}`);
      console.log("[TreinosScreen] /health failed:", msg);
    }

    try {
      const res = await fetch(requestUrl);

      console.log("[TreinosScreen] response.status:", res.status);

      if (!res.ok) {
        const rawText = await res.text();
        console.log("[TreinosScreen] failure response body (raw):", rawText);
        const diagnostic = `HTTP ${res.status}: ${rawText.slice(0, 200)}${rawText.length > 200 ? "…" : ""}`;
        setError(diagnostic);
        return;
      }

      const rawText = await res.text();
      let list: Workout[];

      try {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) {
          list = parsed;
        } else if (parsed && Array.isArray(parsed.data)) {
          list = parsed.data;
        } else {
          console.log("[TreinosScreen] unexpected response shape:", typeof parsed, Object.keys(parsed || {}));
          setError("Resposta inesperada: não é lista de treinos.");
          return;
        }
      } catch (parseErr) {
        console.error("[TreinosScreen] JSON parse error:", parseErr);
        console.log("[TreinosScreen] raw response:", rawText.slice(0, 300));
        setError(`Resposta inválida: ${rawText.slice(0, 100)}…`);
        return;
      }

      setTreinos(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[TreinosScreen] fetch error:", err);
      setError(`Erro de rede: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadTreinos();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 10 }}>Carregando treinos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>{error}</Text>
        <Text style={styles.diagnostic}>API_URL: {apiUrlUsed || API_URL}</Text>
        <Text style={styles.diagnostic}>Health: {healthCheckResult || "—"}</Text>
        <TouchableOpacity
          style={[styles.createButton, { marginTop: 16 }]}
          onPress={loadTreinos}
        >
          <Text style={styles.createButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(apiUrlUsed || healthCheckResult) ? (
        <Text style={styles.diagnostic} numberOfLines={2}>
          API_URL: {apiUrlUsed || API_URL} | Health: {healthCheckResult || "—"}
        </Text>
      ) : null}
      {/* Botão Criar Treino */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate("CreateWorkout")}
      >
        <Text style={styles.createButtonText}>+ Criar treino</Text>
      </TouchableOpacity>

      {/* Lista de Treinos */}
      {treinos.length === 0 ? (
        <Text style={styles.emptyText}>Nenhum treino cadastrado.</Text>
      ) : (
        <FlatList
          data={treinos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate("WorkoutDetails", { workoutId: item.id })
              }
              activeOpacity={0.7}
            >
              <Text style={styles.date}>
                {new Date(item.date).toLocaleDateString()}
              </Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.category}>{item.category}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FFF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  createButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  createButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 40,
  },
  diagnostic: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#F3F4F6",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  date: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  category: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 4,
  },
});
