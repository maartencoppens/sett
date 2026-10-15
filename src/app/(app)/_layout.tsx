import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/lib/theme";
import { Link, Stack } from "expo-router";

function ProfileButton() {
  const { colors } = useTheme();
  return (
    <Link href="/profile" accessibilityLabel="Profile">
      <ThemedText style={{ color: colors.accent }}>Profile</ThemedText>
    </Link>
  );
}

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: "Sett", headerRight: () => <ProfileButton /> }}
      />
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
      <Stack.Screen
        name="availability/index"
        options={{ title: "My availability" }}
      />
      <Stack.Screen
        name="availability/new"
        options={{ title: "Add busy time", presentation: "modal" }}
      />
    </Stack>
  );
}
