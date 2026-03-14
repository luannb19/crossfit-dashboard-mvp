import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabs from "./BottomTabs";
import CreateWorkoutScreen from "../screens/CreateWorkoutScreen";
import WorkoutDetailsScreen from "../screens/WorkoutDetailsScreen";
import EditWorkoutScreen from "../screens/EditWorkoutScreen";
import CreateClassScreen from "../screens/CreateClassScreen";
import EditClassScreen from "../screens/EditClassScreen";
import ClassAttendanceScreen from "../screens/ClassAttendanceScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={BottomTabs}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="CreateWorkout"
          component={CreateWorkoutScreen}
          options={{ title: "Criar Treino" }}
        />

        <Stack.Screen
          name="WorkoutDetails"
          component={WorkoutDetailsScreen}
          options={{ title: "Detalhes do treino" }}
        />

        <Stack.Screen
          name="EditWorkout"
          component={EditWorkoutScreen}
          options={{ title: "Editar treino" }}
        />

        <Stack.Screen
          name="CreateClass"
          component={CreateClassScreen}
          options={{ title: "Nova aula" }}
        />

        <Stack.Screen
          name="EditClass"
          component={EditClassScreen}
          options={{ title: "Editar aula" }}
        />

        <Stack.Screen
          name="ClassAttendance"
          component={ClassAttendanceScreen}
          options={{ title: "Presenças" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

