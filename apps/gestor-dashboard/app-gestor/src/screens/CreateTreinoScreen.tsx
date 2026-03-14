import { View, Text, StyleSheet } from "react-native";

export default function CreateTreinoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Criar Treino</Text>
      <Text style={styles.subtitle}>Formulário virá aqui no próximo passo.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: "#9CA3AF",
  },
});
