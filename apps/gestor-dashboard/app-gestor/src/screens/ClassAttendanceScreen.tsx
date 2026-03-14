import { useCallback, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Switch,
  RefreshControl,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "@/config/api";

type User = { id: string; name: string; email: string; role: string };
type AttendanceRecord = { id: string; userId: string; classId: string; attendedAt: string };

type RootStackParamList = {
  MainTabs: undefined;
  CreateWorkout: undefined;
  WorkoutDetails: { workoutId: string };
  EditWorkout: { workoutId: string };
  CreateClass: undefined;
  EditClass: { classId: string };
  ClassAttendance: { classId: string };
};
type Props = NativeStackScreenProps<RootStackParamList, "ClassAttendance">;

export default function ClassAttendanceScreen({ route }: Props) {
  const { classId } = route.params;
  const [classTitle, setClassTitle] = useState<string>("");
  const [members, setMembers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const [classRes, usersRes, attRes] = await Promise.all([
        fetch(`${API_URL}/api/classes/${classId}`),
        fetch(`${API_URL}/api/users`),
        fetch(`${API_URL}/api/attendance?classId=${encodeURIComponent(classId)}`),
      ]);
      const classData = await classRes.json().catch(() => ({}));
      setClassTitle(classData?.title ?? "Aula");
      const users = await usersRes.json().catch(() => []);
      setMembers(Array.isArray(users) ? users : []);
      const att = await attRes.json().catch(() => []);
      setAttendance(Array.isArray(att) ? att : []);
    } catch (_) {
      setMembers([]);
      setAttendance([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const attendedUserIds = new Set(attendance.map((a) => a.userId));

  async function toggleCheckIn(userId: string, checked: boolean) {
    setToggling((prev) => ({ ...prev, [userId]: true }));
    try {
      if (checked) {
        const res = await fetch(`${API_URL}/api/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, userId }),
        });
        if (res.ok || res.status === 201) {
          const created = await res.json().catch(() => null);
          if (created) setAttendance((prev) => [...prev, created]);
        }
      } else {
        const res = await fetch(`${API_URL}/api/attendance`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, userId }),
        });
        if (res.ok || res.status === 204) {
          setAttendance((prev) => prev.filter((a) => a.userId !== userId));
        }
      }
    } finally {
      setToggling((prev) => ({ ...prev, [userId]: false }));
    }
  }

  if (loading && members.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Carregando…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{classTitle}</Text>
      <Text style={styles.subtitle}>Marcar presença</Text>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        renderItem={({ item }) => {
          const checked = attendedUserIds.has(item.id);
          const busy = toggling[item.id];
          return (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberRole}>{item.role}</Text>
              </View>
              <Switch
                value={checked}
                onValueChange={(value) => toggleCheckIn(item.id, value)}
                disabled={busy}
                trackColor={{ false: "#E5E7EB", true: "#4F46E5" }}
                thumbColor="#FFF"
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum membro cadastrado.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#FFF" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingText: { marginTop: 10, color: "#6B7280" },
  title: { fontSize: 18, fontWeight: "bold", color: "#111", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  rowLeft: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: "600", color: "#111" },
  memberRole: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 24 },
});
