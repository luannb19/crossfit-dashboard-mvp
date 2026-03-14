import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "@/config/api";

const CATEGORIES = ["METCON", "STRENGTH", "TECHNIQUE", "MOBILITY"] as const;
type Category = (typeof CATEGORIES)[number];

type RootStackParamList = {
  MainTabs: undefined;
  CreateWorkout: undefined;
  WorkoutDetails: { workoutId: string };
  EditWorkout: { workoutId: string };
};
type Props = NativeStackScreenProps<RootStackParamList, "EditWorkout">;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function isValidDateString(s: string): boolean {
  if (!ISO_DATE_REGEX.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

function formatDateForInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function EditWorkoutScreen({ route, navigation }: Props) {
  const { workoutId } = route.params;
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/workouts/${workoutId}`);
      const raw = await res.text();
      if (!res.ok) {
        setError(raw || `HTTP ${res.status}`);
        return;
      }
      const w = JSON.parse(raw) as {
        date: string;
        title: string;
        category: string;
        description?: string | null;
        videoUrl?: string | null;
      };
      setDate(formatDateForInput(w.date));
      setTitle(w.title);
      setCategory(w.category as Category);
      setDescription(w.description ?? "");
      setVideoUrl(w.videoUrl ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useFocusEffect(
    useCallback(() => {
      loadWorkout();
    }, [loadWorkout])
  );

  function validate(): string | null {
    const trimmedDate = date.trim();
    const trimmedTitle = title.trim();
    if (!trimmedDate) return "Data é obrigatória.";
    if (!isValidDateString(trimmedDate))
      return "Use a data no formato AAAA-MM-DD (ex: 2025-03-08).";
    if (!trimmedTitle) return "Título é obrigatório.";
    if (!category) return "Selecione uma categoria.";
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        date: new Date(date.trim() + "T12:00:00.000Z").toISOString(),
        title: title.trim(),
        description: description.trim() || "",
        category,
      };
      if (videoUrl.trim()) payload.videoUrl = videoUrl.trim();

      const res = await fetch(`${API_URL}/api/workouts/${workoutId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data?.error as string) ?? "Erro ao salvar treino.");
        return;
      }
      navigation.goBack();
    } catch (err) {
      console.error(err);
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Carregando…</Text>
      </View>
    );
  }

  if (error && !date && !title) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.submitBtn} onPress={loadWorkout}>
          <Text style={styles.submitBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Data *</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={(t) => { setDate(t); setError(null); }}
          placeholder="Ex: 2025-03-08"
          placeholderTextColor="#9CA3AF"
          editable={!saving}
        />
        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={(t) => { setTitle(t); setError(null); }}
          placeholder="Nome do treino"
          placeholderTextColor="#9CA3AF"
          editable={!saving}
        />
        <Text style={styles.label}>Categoria *</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
              onPress={() => { setCategory(cat); setError(null); }}
              disabled={saving}
            >
              <Text
                style={[
                  styles.categoryBtnText,
                  category === cat && styles.categoryBtnTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descrição do treino (opcional)"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
          editable={!saving}
        />
        <Text style={styles.label}>URL do vídeo (opcional)</Text>
        <TextInput
          style={styles.input}
          value={videoUrl}
          onChangeText={setVideoUrl}
          placeholder="https://..."
          placeholderTextColor="#9CA3AF"
          keyboardType="url"
          autoCapitalize="none"
          editable={!saving}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Salvar alterações</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: "#FFF" },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingText: { marginTop: 10, color: "#6B7280" },
  errorText: { color: "#DC2626", fontSize: 14, marginTop: 12 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111",
  },
  textArea: { minHeight: 80, textAlignVertical: "top" as const },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryBtnActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  categoryBtnText: { fontSize: 14, fontWeight: "500", color: "#374151" },
  categoryBtnTextActive: { color: "#FFF" },
  submitBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#FFF", fontWeight: "600", fontSize: 16 },
});
