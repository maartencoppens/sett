import { ThemedText } from "@/components/ui/themed-text";
import {
  disableGroup,
  enableGroup,
  isGroupSynced,
  requestCalendarAccess,
} from "@/lib/features/device-calendar";
import { useSession } from "@/lib/providers/session";
import { useTheme } from "@/lib/providers/theme";
import { useEffect, useState } from "react";
import { Alert, Linking, Switch, View } from "react-native";

export function DeviceCalendarToggle({ groupId }: { groupId: string }) {
  const { session } = useSession();
  const userId = session!.user.id;
  const { colors } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    isGroupSynced(userId, groupId).then(setEnabled);
  }, [userId, groupId]);

  async function toggle(on: boolean) {
    setBusy(true);
    try {
      if (on) {
        const access = await requestCalendarAccess();
        if (access === "blocked") {
          Alert.alert(
            "Calendar access is off",
            "Allow Sett to use your calendar in Settings to turn this on.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
        if (access !== "granted") return;
        await enableGroup(userId, groupId);
      } else {
        await disableGroup(userId, groupId);
      }
      setEnabled(on);
    } catch (error) {
      Alert.alert(
        "Something went wrong",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText>Show in my phone's calendar</ThemedText>
        <ThemedText muted style={{ fontSize: 13 }}>
          A separate calendar with this group's confirmed events and a reminder
          an hour before each one.
        </ThemedText>
      </View>
      <Switch
        value={enabled}
        onValueChange={toggle}
        disabled={busy}
        trackColor={{ true: colors.accent }}
      />
    </View>
  );
}
