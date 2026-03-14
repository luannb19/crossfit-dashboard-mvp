import { useCallback, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "@/config/api";

type Workout = {
  id: string;
  boxId: string;
  date: string;
  title: string;
  description?: string | null;
  category: string;
  videoUrl?: string | null;
};

type RootStackParamList = {
  MainTabs: undefined;
  CreateWorkout: undefined;
  WorkoutDetails: { workoutId: string };
  EditWorkout: { workoutId: string };
};
type Props = NativeStackScreenProps<RootStackParamList, "WorkoutDetails">;

export default function WorkoutDetailsScreen({
  route,
  navigation,
}: Props) {
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadWorkout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/workouts/${workoutId}`);
      const raw = await res.text();
      if (!res.ok) {
        setError(raw || `HTTP ${res.status}`);
        setWorkout(null);
        return;
      }
      setWorkout(JSON.parse(raw) as Workout);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
      setWorkout(null);
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useFocusEffect(
    useCallback(() => {
      loadWorkout();
    }, [loadWorkout])
  );

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Excluir treino",
      "Tem certeza que deseja excluir este treino?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await fetch(`${API_URL}/api/workouts/${workoutId}`, {
                method: "DELETE",
              });
              if (res.ok || res.status === 204) {
                navigation.goBack();
              } else {
                const text = await res.text();
                Alert.alert("Erro", text || "Não foi possível excluir.");
              }
            } catch (err) {
              Alert.alert(
                "Erro",
                err instanceof Error ? err.message : "Falha de conexão."
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [workoutId, navigation]);

  if (loading && !workout) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Carregando…</Text>
      </View>
    );
  }

  if (error && !workout) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={loadWorkout}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!workout) return null;

  const dateStr = new Date(workout.date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.date}>{dateStr}</Text>
        <Text style={styles.title}>{workout.title}</Text>
        <Text style={styles.category}>{workout.category}</Text>
        {workout.description ? (
          <Text style={styles.description}>{workout.description}</Text>
        ) : null}
        {workout.videoUrl ? (
          <Text style={styles.videoUrl} numberOfLines={1}>
            Vídeo: {workout.videoUrl}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate("EditWorkout", { workoutId })}
        disabled={deleting}
      >
        <Text style={styles.buttonText}>Editar treino</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
        onPress={handleDelete}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Excluir treino</Text>
        )}
      </TouchableOpacity>
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
  errorText: { color: "#DC2626", textAlign: "center", marginBottom: 16 },
  card: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  date: { fontSize: 14, color: "#6B7280", marginBottom: 4 },
  title: { fontSize: 18, fontWeight: "bold", color: "#111", marginBottom: 4 },
  category: { fontSize: 14, color: "#4F46E5", fontWeight: "600", marginBottom: 8 },
  description: { fontSize: 14, color: "#374151", lineHeight: 20 },
  videoUrl: { fontSize: 12, color: "#6B7280", marginTop: 8 },
  button: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: "#FFF", fontWeight: "600", fontSize: 16 },
  editButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonDisabled: { opacity: 0.7 },
});
