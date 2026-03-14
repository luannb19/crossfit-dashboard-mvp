import { Platform } from "react-native";

// Detecta se está no Expo Go
const isExpoGo =
  typeof __DEV__ !== "undefined" &&
  (global as any).ExpoModules !== undefined;

// Detecta se está rodando no browser
const isWeb = Platform.OS === "web";

// Seu IP local (para iPhone acessar o backend)
const LOCAL_IP = "192.168.0.22"; // <-- seu IP aqui

// Porta do backend
const PORT = "4000";

// Calcula a URL base automaticamente
let API_URL = "";

// Web usa localhost
if (isWeb) {
  API_URL = `http://localhost:${PORT}`;
}
// Android emulado usa 10.0.2.2
else if (Platform.OS === "android") {
  API_URL = `http://10.0.2.2:${PORT}`;
}
// iPhone físico via Expo Go usa seu IP (Expo Go ignores app.json infoPlist/ATS; ATS only applies to dev/standalone builds)
else {
  API_URL = `http://${LOCAL_IP}:${PORT}`;
}

export { API_URL };
