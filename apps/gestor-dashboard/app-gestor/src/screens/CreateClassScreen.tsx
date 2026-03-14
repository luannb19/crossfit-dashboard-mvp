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

type RootStackParamList = {
  MainTabs: undefined;
  CreateWorkout: undefined;
  WorkoutDetails: { workoutId: string };
  EditWorkout: { workoutId: string };
  CreateClass: undefined;
  EditClass: { classId: string };
};
type Props = NativeStackScreenProps<RootStackParamList, "CreateClass">;

// Accept "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm"
function parseStartAt(s: string): string | null {
  const trimmed = s.trim();
  const replaced = trimmed.replace(" ", "T");
  const d = new Date(replaced);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function CreateClassScreen({ navigation }: Props) {
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!title.trim()) return "Título é obrigatório.";
    const parsed = parseStartAt(startAt);
    if (!parsed) return "Data/hora inválida. Use ex: 2025-03-15 09:00";
    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 1) return "Capacidade deve ser um número maior que 0.";
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const startIso = parseStartAt(startAt)!;
      const res = await fetch(`${API_URL}/api/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startAt: startIso,
          capacity: parseInt(capacity, 10),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) ?? "Erro ao criar aula.");
        return;
      }
      navigation.goBack();
    } catch (err) {
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
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={(t) => { setTitle(t); setError(null); }}
          placeholder="Ex: WOD 6h"
          placeholderTextColor="#9CA3AF"
          editable={!saving}
        />
        <Text style={styles.label}>Data e hora *</Text>
        <TextInput
          style={styles.input}
          value={startAt}
          onChangeText={(t) => { setStartAt(t); setError(null); }}
          placeholder="Ex: 2025-03-15 09:00"
          placeholderTextColor="#9CA3AF"
          editable={!saving}
        />
        <Text style={styles.label}>Capacidade *</Text>
        <TextInput
          style={styles.input}
          value={capacity}
          onChangeText={(t) => { setCapacity(t); setError(null); }}
          placeholder="Ex: 20"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
          editable={!saving}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Criar aula</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: "#FFF" },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
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
  errorText: { color: "#DC2626", fontSize: 14, marginTop: 12 },
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
