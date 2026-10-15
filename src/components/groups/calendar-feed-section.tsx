import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import { feedUrls } from "@/lib/features/calendar-feed";
import { useSession } from "@/lib/providers/session";
import { supabase } from "@/lib/supabase/client";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform, View } from "react-native";

export function CalendarFeedSection({ groupId }: { groupId: string }) {
  const { session } = useSession();
  const me = session!.user.id;
  const [token, setToken] = useState<string | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    supabase
      .from("calendar_feeds")
      .select("token")
      .eq("group_id", groupId)
      .eq("user_id", me)
      .maybeSingle()
      .then(({ data }) => setToken(data?.token ?? null));
  }, [groupId, me]);

  async function createToken() {
    const { data, error } = await supabase.rpc("rotate_calendar_feed", {
      p_group_id: groupId,
    });
    if (error || !data) {
      Alert.alert("Could not set up the calendar feed", error?.message);
      return null;
    }
    setToken(data);
    return data;
  }

  function reset() {
    Alert.alert(
      "Reset your calendar link?",
      "Your current link stops working. You will need to subscribe again with the new one.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => createToken() },
      ],
    );
  }

  async function turnOff() {
    const { error } = await supabase
      .from("calendar_feeds")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", me);
    if (error) return Alert.alert("Could not turn off", error.message);
    setToken(null);
  }

  if (token === undefined) return null;

  if (token === null) {
    return (
      <View style={{ gap: 8 }}>
        <ThemedText muted style={{ fontSize: 14, fontWeight: "600" }}>
          Calendar
        </ThemedText>
        <ThemedText muted>
          For other calendar apps, like your laptop or Google Calendar on the
          web. On this phone, use the switch above instead.
        </ThemedText>
        <Button
          title="Set up calendar feed"
          variant="secondary"
          onPress={createToken}
        />
      </View>
    );
  }

  const urls = feedUrls(token);

  return (
    <View style={{ gap: 8 }}>
      <ThemedText muted style={{ fontSize: 14, fontWeight: "600" }}>
        Calendar
      </ThemedText>
      {Platform.OS === "ios" && (
        <Button
          title="Add to Apple Calendar"
          onPress={() => Linking.openURL(urls.webcal)}
        />
      )}
      <Button
        title="Add to Google Calendar"
        variant={Platform.OS === "ios" ? "secondary" : "primary"}
        onPress={() => Linking.openURL(urls.google)}
      />
      <Button
        title="Copy link"
        variant="secondary"
        onPress={async () => {
          await Clipboard.setStringAsync(urls.https);
          Alert.alert(
            "Link copied",
            "Paste it into your calendar app as a subscription. Keep it private.",
          );
        }}
      />
      <ThemedText muted style={{ fontSize: 13 }}>
        This link is personal. Anyone who has it can see this group's confirmed
        events. Google Calendar can take up to a day to show changes.
      </ThemedText>
      <Button title="Reset link" variant="secondary" onPress={reset} />
      <Button title="Turn off" variant="danger" onPress={turnOff} />
    </View>
  );
}
