import { ThemedText } from "@/components/ui/themed-text";
import { useSession } from "@/lib/providers/session";
import { useTheme } from "@/lib/providers/theme";
import { supabase } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

type Member = {
  user_id: string;
  profiles: { display_name: string | null } | null;
};
type Status = "in" | "unsure" | "out";

type Props = {
  eventId: string;
  members: Member[];
  /** Answers on the confirmed date option: the starting point for attendance */
  requestAnswers: Map<string, string>;
  refreshKey: number;
};

const STATUSES: { key: Status; label: string }[] = [
  { key: "in", label: "In" },
  { key: "unsure", label: "Unsure" },
  { key: "out", label: "Out" },
];

export function AttendanceSection({
  eventId,
  members,
  requestAnswers,
  refreshKey,
}: Props) {
  const { session } = useSession();
  const me = session!.user.id;
  const { colors } = useTheme();
  const [explicit, setExplicit] = useState<Map<string, string>>(new Map());

  const load = useCallback(() => {
    supabase
      .from("attendance")
      .select("user_id, status")
      .eq("event_id", eventId)
      .then(({ data }) =>
        setExplicit(new Map((data ?? []).map((a) => [a.user_id, a.status]))),
      );
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // An explicit choice wins; otherwise fall back to the request answer
  function statusOf(userId: string): Status | undefined {
    const set = explicit.get(userId);
    if (set) return set as Status;
    const answer = requestAnswers.get(userId);
    return answer === "accept"
      ? "in"
      : answer === "decline"
        ? "out"
        : undefined;
  }

  async function choose(status: Status) {
    const { error } =
      explicit.get(me) === status
        ? await supabase
            .from("attendance")
            .delete()
            .eq("event_id", eventId)
            .eq("user_id", me)
        : await supabase.from("attendance").upsert(
            {
              event_id: eventId,
              user_id: me,
              status,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "event_id,user_id" },
          );
    if (error) return Alert.alert("Could not update attendance", error.message);
    load();
  }

  const mine = statusOf(me);
  const unknown = members.filter((m) => !statusOf(m.user_id));

  return (
    <View style={styles.section}>
      <ThemedText muted style={styles.title}>
        Are you coming?
      </ThemedText>

      <View style={styles.choices}>
        {STATUSES.map((s) => {
          const selected = mine === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => choose(s.key)}
              style={[
                styles.choice,
                { borderColor: colors.border },
                selected && {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <ThemedText
                style={
                  selected
                    ? { color: colors.onAccent, fontWeight: "600" }
                    : undefined
                }
              >
                {s.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {STATUSES.map((s) => {
        const people = members.filter((m) => statusOf(m.user_id) === s.key);
        if (people.length === 0) return null;
        return (
          <ThemedText key={s.key} style={styles.line}>
            <ThemedText style={{ fontWeight: "600" }}>
              {s.label} ({people.length}):{" "}
            </ThemedText>
            {people
              .map((m) => m.profiles?.display_name ?? "Someone")
              .join(", ")}
          </ThemedText>
        );
      })}
      {unknown.length > 0 && (
        <ThemedText muted style={styles.line}>
          No answer:{" "}
          {unknown.map((m) => m.profiles?.display_name ?? "Someone").join(", ")}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  title: { fontSize: 14, fontWeight: "600" },
  choices: { flexDirection: "row", gap: 8 },
  choice: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  line: { fontSize: 14 },
});
