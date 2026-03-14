import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "@/screens/HomeScreen";
import TreinosScreen from "@/screens/TreinosScreen";
import ClassesScreen from "@/screens/ClassesScreen";
import PerfilScreen from "@/screens/PerfilScreen";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Treinos" component={TreinosScreen} />
      <Tab.Screen name="Aulas" component={ClassesScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}
