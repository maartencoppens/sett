import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-time-field";
import { TextField } from "@/components/ui/text-field";
import { ThemedText } from "@/components/ui/themed-text";
import { useGroupModules } from "@/lib/hooks/use-group-modules";
import { useTheme } from "@/lib/providers/theme";
import { supabase } from "@/lib/supabase/client";
import type { Tables, TablesUpdate } from "@/lib/supabase/database.types";
import { combine, todayAt } from "@/lib/utils/dates";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";

export default function EditEvent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const [event, setEvent] = useState<Tables<"events"> | null>(null);
  const modules = useGroupModules(event?.group_id);

  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [hasLoadIn, setHasLoadIn] = useState(false);
  const [loadIn, setLoadIn] = useState(todayAt(17));
  const [hasSoundcheck, setHasSoundcheck] = useState(false);
  const [soundcheck, setSoundcheck] = useState(todayAt(18));

  useEffect(() => {
    supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setEvent(data);
        setTitle(data.title ?? "");
        setVenue(data.venue ?? "");
        setAddress(data.address ?? "");
        setNotes(data.notes ?? "");
        if (data.load_in_at) {
          setHasLoadIn(true);
          setLoadIn(new Date(data.load_in_at));
        }
        if (data.soundcheck_at) {
          setHasSoundcheck(true);
          setSoundcheck(new Date(data.soundcheck_at));
        }
      });
  }, [id]);

  const showDay = useMemo(
    () => (event?.starts_at ? new Date(event.starts_at) : null),
    [event?.starts_at],
  );
  const showGigTimes =
    event?.type === "gig" &&
    event.status === "confirmed" &&
    modules.has("gig_details") &&
    !!showDay;

  async function save() {
    const update: TablesUpdate<"events"> = {
      title: title.trim() || null,
      venue: venue.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };
    if (showGigTimes && showDay) {
      update.load_in_at = hasLoadIn
        ? combine(showDay, loadIn).toISOString()
        : null;
      update.soundcheck_at = hasSoundcheck
        ? combine(showDay, soundcheck).toISOString()
        : null;
    }

    const { error } = await supabase
      .from("events")
      .update(update)
      .eq("id", id)
      .select("id")
      .single();
    if (error) {
      const message = error.message.includes("gig_times_before_show")
        ? "Load-in and soundcheck have to be before the show starts."
        : error.message;
      return Alert.alert("Could not save", message);
    }
    router.back();
  }

  if (!event)
    return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText muted style={styles.label}>
        Title
      </ThemedText>
      <TextField
        value={title}
        onChangeText={setTitle}
        maxLength={80}
        placeholder="Optional"
      />

      <ThemedText muted style={styles.label}>
        Venue
      </ThemedText>
      <TextField
        value={venue}
        onChangeText={setVenue}
        maxLength={120}
        placeholder="e.g. Charlatan, or Jef's garage"
      />
      <TextField
        value={address}
        onChangeText={setAddress}
        maxLength={200}
        placeholder="Address"
        autoComplete="street-address"
        textContentType="fullStreetAddress"
      />

      {showGigTimes && (
        <View style={{ gap: 4 }}>
          <ThemedText muted style={styles.label}>
            Before the show
          </ThemedText>
          <View style={styles.switchRow}>
            <ThemedText>Load-in</ThemedText>
            <Switch
              value={hasLoadIn}
              onValueChange={setHasLoadIn}
              trackColor={{ true: colors.accent }}
            />
          </View>
          {hasLoadIn && (
            <DateTimeField
              label="Load-in time"
              mode="time"
              value={loadIn}
              onChange={setLoadIn}
            />
          )}
          <View style={styles.switchRow}>
            <ThemedText>Soundcheck</ThemedText>
            <Switch
              value={hasSoundcheck}
              onValueChange={setHasSoundcheck}
              trackColor={{ true: colors.accent }}
            />
          </View>
          {hasSoundcheck && (
            <DateTimeField
              label="Soundcheck time"
              mode="time"
              value={soundcheck}
              onChange={setSoundcheck}
            />
          )}
        </View>
      )}

      <ThemedText muted style={styles.label}>
        Notes
      </ThemedText>
      <TextField
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={1000}
        style={{ minHeight: 100, textAlignVertical: "top" }}
      />

      <Button title="Save" onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
});
