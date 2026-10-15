import { ThemedText } from "@/components/ui/themed-text";
import { useDeviceCalendarSync } from "@/lib/hooks/use-device-calendar-sync";
import { useTheme } from "@/lib/providers/theme";
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
  useDeviceCalendarSync();

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
      <Stack.Screen
        name="events/new"
        options={{ title: "New request", presentation: "modal" }}
      />
      <Stack.Screen name="events/[id]/index" options={{ title: "Event" }} />
      <Stack.Screen
        name="events/[id]/edit"
        options={{ title: "Edit event", presentation: "modal" }}
      />
    </Stack>
  );
}
