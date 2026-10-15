import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-time-field";
import { TextField } from "@/components/ui/text-field";
import { ThemedText } from "@/components/ui/themed-text";
import {
  EVENT_TYPES,
  defaultEventType,
  type EventType,
} from "@/lib/features/events";
import { useActiveGroup } from "@/lib/providers/active-group";
import { useTheme, type Theme } from "@/lib/providers/theme";
import { supabase } from "@/lib/supabase/client";
import { combine, todayAt } from "@/lib/utils/dates";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

type DraftOption = { key: string; date: Date; start: Date; end: Date };

const MAX_OPTIONS = 5;

function newOption(): DraftOption {
  return {
    key: Math.random().toString(36),
    date: new Date(),
    start: todayAt(19),
    end: todayAt(22),
  };
}

/** End before start means "after midnight": a gig from 22:00 to 01:00 */
function toRange(option: DraftOption) {
  const start = combine(option.date, option.start);
  const end = combine(option.date, option.end);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { starts_at: start.toISOString(), ends_at: end.toISOString(), start };
}

export default function NewEventRequest() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { activeGroup } = useActiveGroup();

  const [type, setType] = useState<EventType>(
    defaultEventType(activeGroup?.template),
  );
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [options, setOptions] = useState<DraftOption[]>([newOption()]);

  function updateOption(key: string, patch: Partial<DraftOption>) {
    setOptions((current) =>
      current.map((o) => (o.key === key ? { ...o, ...patch } : o)),
    );
  }

  async function send() {
    if (!activeGroup) return;
    const ranges = options.map(toRange);
    if (ranges.some((r) => r.start < new Date())) {
      return Alert.alert("One of the dates is in the past");
    }

    const { data: eventId, error } = await supabase.rpc(
      "create_event_request",
      {
        p_group_id: activeGroup.id,
        p_type: type,
        p_title: title,
        p_notes: notes,
        p_options: ranges.map(({ starts_at, ends_at }) => ({
          starts_at,
          ends_at,
        })),
      },
    );
    if (error) return Alert.alert("Could not send request", error.message);
    router.replace(`/events/${eventId}`);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.segment}>
        {EVENT_TYPES.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setType(t.key)}
            style={[
              styles.segmentItem,
              type === t.key && styles.segmentItemActive,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: type === t.key }}
          >
            <ThemedText
              style={
                type === t.key
                  ? { color: colors.onAccent, fontWeight: "600" }
                  : undefined
              }
            >
              {t.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <TextField
        value={title}
        onChangeText={setTitle}
        placeholder={
          type === "gig" ? "e.g. Gig at Charlatan" : "Title (optional)"
        }
        maxLength={80}
      />

      <ThemedText muted style={styles.label}>
        {options.length === 1 ? "When?" : "Date options"}
      </ThemedText>

      {options.map((option, index) => (
        <View key={option.key} style={styles.option}>
          {options.length > 1 && (
            <View style={styles.optionHeader}>
              <ThemedText style={{ fontWeight: "600" }}>
                Option {index + 1}
              </ThemedText>
              <Pressable
                onPress={() =>
                  setOptions((current) =>
                    current.filter((o) => o.key !== option.key),
                  )
                }
                accessibilityRole="button"
              >
                <ThemedText style={{ color: colors.danger }}>Remove</ThemedText>
              </Pressable>
            </View>
          )}
          <DateTimeField
            label="Date"
            mode="date"
            value={option.date}
            minimumDate={new Date()}
            onChange={(date) => updateOption(option.key, { date })}
          />
          <DateTimeField
            label="Start"
            mode="time"
            value={option.start}
            onChange={(start) => updateOption(option.key, { start })}
          />
          <DateTimeField
            label="End"
            mode="time"
            value={option.end}
            onChange={(end) => updateOption(option.key, { end })}
          />
        </View>
      ))}

      {options.length < MAX_OPTIONS && (
        <Button
          title="+ Add another date"
          variant="secondary"
          onPress={() => setOptions((current) => [...current, newOption()])}
        />
      )}

      <ThemedText muted style={styles.label}>
        Notes
      </ThemedText>
      <TextField
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything people should know?"
        multiline
        maxLength={1000}
        style={{ minHeight: 80, textAlignVertical: "top" }}
      />

      <Button title="Send request" onPress={send} />
    </ScrollView>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    container: { padding: 24, gap: 12 },
    label: { fontSize: 14, fontWeight: "600", marginTop: 8 },
    segment: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 4,
    },
    segmentItem: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
      borderRadius: 8,
    },
    segmentItemActive: { backgroundColor: colors.accent },
    option: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    optionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 10,
    },
  });
