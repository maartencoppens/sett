import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Sett" }} />
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
        <Stack.Screen
          name="groups/new"
          options={{ title: "New group", presentation: "modal" }}
        />
        <Stack.Screen name="groups/[id]" options={{ title: "Group" }} />
        <Stack.Screen
          name="join/index"
          options={{ title: "Join a group", presentation: "modal" }}
        />
        <Stack.Screen name="join/[code]" options={{ title: "Join a group" }} />
      </Stack>
    </Stack>
  );
}
