import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-time-field";
import { TextField } from "@/components/ui/text-field";
import { ThemedText } from "@/components/ui/themed-text";
import { WEEKDAYS, deviceTimeZone } from "@/lib/features/availability";
import { useTheme, type Theme } from "@/lib/providers/theme";
import { supabase } from "@/lib/supabase/client";
import type { TablesInsert } from "@/lib/supabase/database.types";
import {
  combine,
  toDateString,
  toTimeString,
  todayAt,
} from "@/lib/utils/dates";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";

type Kind = "weekly" | "none";

export default function NewBusyTime() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [kind, setKind] = useState<Kind>("weekly");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  // weekly
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState(todayAt(19));
  const [endTime, setEndTime] = useState(todayAt(22));
  const [hasUntil, setHasUntil] = useState(false);
  const [untilDate, setUntilDate] = useState(new Date());

  // one-off
  const [fromDate, setFromDate] = useState(new Date());
  const [fromTime, setFromTime] = useState(todayAt(9));
  const [toDate, setToDate] = useState(new Date());
  const [toTime, setToTime] = useState(todayAt(17));

  function toggleDay(iso: number) {
    setDays((current) =>
      current.includes(iso)
        ? current.filter((d) => d !== iso)
        : [...current, iso],
    );
  }

  async function save() {
    const cleanLabel = label.trim() || null;
    let rows: TablesInsert<"availability_blocks">[];

    if (kind === "weekly") {
      if (days.length === 0) return Alert.alert("Pick at least one day");
      if (toTimeString(endTime) <= toTimeString(startTime)) {
        return Alert.alert("The end time must be after the start time");
      }
      const timeZone = deviceTimeZone();
      // one row per selected weekday
      rows = days.map((weekday) => ({
        repeat: "weekly",
        label: cleanLabel,
        weekday,
        start_time: toTimeString(startTime),
        end_time: toTimeString(endTime),
        time_zone: timeZone,
        until_date: hasUntil ? toDateString(untilDate) : null,
      }));
    } else {
      const start = combine(fromDate, fromTime);
      const end = combine(toDate, toTime);
      if (end <= start) return Alert.alert("The end must be after the start");
      rows = [
        {
          repeat: "none",
          label: cleanLabel,
          starts_at: start.toISOString(), // a real moment in time → UTC is correct here
          ends_at: end.toISOString(),
        },
      ];
    }

    setSaving(true);
    const { error } = await supabase.from("availability_blocks").insert(rows);
    setSaving(false);
    if (error) return Alert.alert("Could not save", error.message);
    router.back();
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* One-off / weekly toggle */}
      <View style={styles.segment}>
        {(
          [
            ["weekly", "Every week"],
            ["none", "One time"],
          ] as const
        ).map(([value, text]) => (
          <Pressable
            key={value}
            onPress={() => setKind(value)}
            style={[
              styles.segmentItem,
              kind === value && styles.segmentItemActive,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: kind === value }}
          >
            <ThemedText
              style={
                kind === value
                  ? { color: colors.onAccent, fontWeight: "600" }
                  : undefined
              }
            >
              {text}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {kind === "weekly" ? (
        <>
          <ThemedText muted style={styles.label}>
            Days
          </ThemedText>
          <View style={styles.days}>
            {WEEKDAYS.map((d) => {
              const selected = days.includes(d.iso);
              return (
                <Pressable
                  key={d.iso}
                  onPress={() => toggleDay(d.iso)}
                  style={[styles.day, selected && styles.daySelected]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  <ThemedText
                    style={selected ? { color: colors.onAccent } : undefined}
                  >
                    {d.short}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <DateTimeField
            label="From"
            mode="time"
            value={startTime}
            onChange={setStartTime}
          />
          <DateTimeField
            label="Until"
            mode="time"
            value={endTime}
            onChange={setEndTime}
          />

          <View style={styles.switchRow}>
            <ThemedText>Ends on a date</ThemedText>
            <Switch
              value={hasUntil}
              onValueChange={setHasUntil}
              trackColor={{ true: colors.accent }}
            />
          </View>
          {hasUntil && (
            <DateTimeField
              label="Last week"
              mode="date"
              value={untilDate}
              onChange={setUntilDate}
              minimumDate={new Date()}
            />
          )}
        </>
      ) : (
        <>
          <DateTimeField
            label="Start date"
            mode="date"
            value={fromDate}
            onChange={(d) => {
              setFromDate(d);
              if (toDate < d) setToDate(d);
            }}
          />
          <DateTimeField
            label="Start time"
            mode="time"
            value={fromTime}
            onChange={setFromTime}
          />
          <DateTimeField
            label="End date"
            mode="date"
            value={toDate}
            onChange={setToDate}
            minimumDate={fromDate}
          />
          <DateTimeField
            label="End time"
            mode="time"
            value={toTime}
            onChange={setToTime}
          />
        </>
      )}

      <ThemedText muted style={styles.label}>
        Label (only you see this)
      </ThemedText>
      <TextField
        value={label}
        onChangeText={setLabel}
        placeholder="e.g. Work, Football, Holiday"
        maxLength={40}
      />

      <Button title="Save" onPress={save} loading={saving} />
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
    days: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    day: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    daySelected: { backgroundColor: colors.accent, borderColor: colors.accent },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
  });
