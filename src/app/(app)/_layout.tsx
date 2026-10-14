import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Sett" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen
        name="groups/new"
        options={{ title: "New group", presentation: "modal" }}
      />
    </Stack>
  );
}
