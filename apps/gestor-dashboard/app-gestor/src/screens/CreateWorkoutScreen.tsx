import { useState } from "react";
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
import { API_URL } from "@/config/api";

const CATEGORIES = ["METCON", "STRENGTH", "TECHNIQUE", "MOBILITY"] as const;
type Category = (typeof CATEGORIES)[number];

const BOX_ID = "superforce";

type RootStackParamList = {
  MainTabs: undefined;
  CreateWorkout: undefined;
  WorkoutDetails: { workoutId: string };
  EditWorkout: { workoutId: string };
};
type Props = NativeStackScreenProps<RootStackParamList, "CreateWorkout">;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function isValidDateString(s: string): boolean {
  if (!ISO_DATE_REGEX.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

export default function CreateWorkoutScreen({ navigation }: Props) {
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    const trimmedDate = date.trim();
    const trimmedTitle = title.trim();
    if (!trimmedDate) return "Data é obrigatória.";
    if (!isValidDateString(trimmedDate)) return "Use a data no formato AAAA-MM-DD (ex: 2025-03-08).";
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
        boxId: BOX_ID,
        date: new Date(date.trim() + "T12:00:00.000Z").toISOString(),
        title: title.trim(),
        description: description.trim() || "",
        category,
      };
      if (videoUrl.trim()) payload.videoUrl = videoUrl.trim();

      const res = await fetch(`${API_URL}/api/workouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = data?.error ?? "Erro ao criar treino.";
        setError(message);
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
        {/* TODO: consider @react-native-community/datetimepicker for native date picker (Expo-compatible) */}
        <Text style={styles.label}>Data *</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={(t) => {
            setDate(t);
            setError(null);
          }}
          placeholder="Ex: 2025-03-08"
          placeholderTextColor="#9CA3AF"
          editable={!saving}
        />

        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            setError(null);
          }}
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
              onPress={() => {
                setCategory(cat);
                setError(null);
              }}
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
            <Text style={styles.submitBtnText}>Criar treino</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
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
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryBtnActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  categoryBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  categoryBtnTextActive: {
    color: "#FFF",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    marginTop: 12,
  },
  submitBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
