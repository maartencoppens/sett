import { AttendanceSection } from "@/components/events/attendance-section";
import { BringItemsSection } from "@/components/events/bring-items-section";
import { GigSchedule } from "@/components/events/gig-schedule";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/date-time-field";
import { ThemedText } from "@/components/ui/themed-text";
import { syncDeviceCalendars } from "@/lib/features/device-calendar";
import { eventTypeLabel, formatRange, overlaps } from "@/lib/features/events";
import { useGroupModules } from "@/lib/hooks/use-group-modules";
import { useSession } from "@/lib/providers/session";
import { useTheme, type Theme } from "@/lib/providers/theme";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { combine, todayAt } from "@/lib/utils/dates";
import { openInMaps } from "@/lib/utils/maps";
import type { QueryData } from "@supabase/supabase-js";
import {
  Stack,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

const optionsQuery = (eventId: string) =>
  supabase
    .from("event_date_options")
    .select(
      "id, starts_at, ends_at, suggested_by, event_responses(user_id, response)",
    )
    .eq("event_id", eventId)
    .order("starts_at");

const membersQuery = (groupId: string) =>
  supabase
    .from("group_members")
    .select("user_id, role, profiles(display_name)")
    .eq("group_id", groupId);

type Options = QueryData<ReturnType<typeof optionsQuery>>;
type Members = QueryData<ReturnType<typeof membersQuery>>;
type Busy = { user_id: string; starts_at: string; ends_at: string };

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const me = session!.user.id;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [event, setEvent] = useState<Tables<"events"> | null>(null);
  const [options, setOptions] = useState<Options>([]);
  const [members, setMembers] = useState<Members>([]);
  const [busy, setBusy] = useState<Busy[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // tells child sections to reload
  const modules = useGroupModules(event?.group_id, refreshKey);

  const [suggesting, setSuggesting] = useState(false);
  const [sDate, setSDate] = useState(new Date());
  const [sStart, setSStart] = useState(todayAt(19));
  const [sEnd, setSEnd] = useState(todayAt(22));

  const load = useCallback(async () => {
    const { data: ev, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !ev)
      return Alert.alert("Could not load event", error?.message);
    setEvent(ev);

    const [{ data: opts }, { data: mems }] = await Promise.all([
      optionsQuery(id),
      membersQuery(ev.group_id),
    ]);
    setOptions(opts ?? []);
    setMembers(mems ?? []);

    if (ev.status === "proposed" && opts?.length) {
      const from = opts[0].starts_at;
      const to = opts.reduce(
        (max, o) => (o.ends_at > max ? o.ends_at : max),
        opts[0].ends_at,
      );
      const days =
        (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
      if (days <= 62) {
        const { data } = await supabase.rpc("group_busy", {
          p_group_id: ev.group_id,
          p_from: from,
          p_to: to,
        });
        setBusy(data ?? []);
      }
    }
    setRefreshKey((k) => k + 1);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!event) return null;

  const myRole = members.find((m) => m.user_id === me)?.role;
  const canManage = event.created_by === me || myRole === "admin";
  const nameOf = (userId: string) =>
    members.find((m) => m.user_id === userId)?.profiles?.display_name ??
    "Someone";

  const confirmedOption = options.find(
    (o) => o.id === event.confirmed_option_id,
  );
  const requestAnswers = new Map(
    confirmedOption?.event_responses.map((r) => [r.user_id, r.response]) ?? [],
  );

  async function answer(
    optionId: string,
    current: string | undefined,
    response: "accept" | "decline",
  ) {
    const { error } =
      current === response
        ? await supabase
            .from("event_responses")
            .delete()
            .eq("option_id", optionId)
            .eq("user_id", me)
        : await supabase.from("event_responses").upsert(
            {
              option_id: optionId,
              user_id: me,
              response,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "option_id,user_id" },
          );
    if (error) return Alert.alert("Could not save your answer", error.message);
    load();
  }

  function confirm(optionId: string, label: string) {
    Alert.alert(
      "Confirm this date?",
      `${label}\n\nEveryone's answers will be locked.`,
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            const { error } = await supabase.rpc("confirm_event", {
              p_event_id: id,
              p_option_id: optionId,
            });
            if (error) return Alert.alert("Could not confirm", error.message);
            load();
            syncDeviceCalendars(me);
          },
        },
      ],
    );
  }

  function cancel() {
    Alert.alert(
      "Cancel this?",
      "Everyone in the group will see it as cancelled.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel it",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.rpc("cancel_event", {
              p_event_id: id,
            });
            if (error) return Alert.alert("Could not cancel", error.message);
            syncDeviceCalendars(me);
            router.back();
          },
        },
      ],
    );
  }

  async function suggest() {
    const start = combine(sDate, sStart);
    const end = combine(sDate, sEnd);
    if (end <= start) end.setDate(end.getDate() + 1);
    const { error } = await supabase.rpc("suggest_event_option", {
      p_event_id: id,
      p_starts_at: start.toISOString(),
      p_ends_at: end.toISOString(),
    });
    if (error) return Alert.alert("Could not suggest", error.message);
    setSuggesting(false);
    load();
  }

  const place = [event.venue, event.address].filter(Boolean).join(", ");

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.accent}
        />
      }
    >
      <Stack.Screen
        options={{
          title: eventTypeLabel(event.type),
          headerRight:
            canManage && event.status !== "cancelled"
              ? () => (
                  <Pressable
                    onPress={() => router.push(`/events/${id}/edit`)}
                    accessibilityRole="button"
                  >
                    <ThemedText style={{ color: colors.accent }}>
                      Edit
                    </ThemedText>
                  </Pressable>
                )
              : undefined,
        }}
      />

      <View style={{ gap: 4 }}>
        <ThemedText style={styles.heading}>
          {event.title ?? eventTypeLabel(event.type)}
        </ThemedText>
        <ThemedText muted>
          {event.status === "proposed" &&
            "Proposed · pick the dates you can make"}
          {event.status === "confirmed" &&
            event.starts_at &&
            event.ends_at &&
            formatRange(event.starts_at, event.ends_at)}
          {event.status === "cancelled" && "Cancelled"}
        </ThemedText>
      </View>

      {/* Gig times */}
      {event.status === "confirmed" &&
        event.type === "gig" &&
        modules.has("gig_details") &&
        event.starts_at &&
        event.ends_at && (
          <GigSchedule
            loadInAt={event.load_in_at}
            soundcheckAt={event.soundcheck_at}
            startsAt={event.starts_at}
            endsAt={event.ends_at}
          />
        )}

      {/* Venue */}
      {!!place && (
        <View style={styles.card}>
          {!!event.venue && (
            <ThemedText style={{ fontWeight: "600" }}>{event.venue}</ThemedText>
          )}
          {!!event.address && <ThemedText muted>{event.address}</ThemedText>}
          <Button
            title="Open in maps"
            variant="secondary"
            onPress={() => openInMaps(place)}
          />
        </View>
      )}

      {!!event.notes && <ThemedText>{event.notes}</ThemedText>}

      {/* Planning: date options (unchanged from last step) */}
      {event.status === "proposed" &&
        options.map((option) => {
          const answers = new Map(
            option.event_responses.map((r) => [r.user_id, r.response]),
          );
          const yes = members.filter(
            (m) => answers.get(m.user_id) === "accept",
          );
          const no = members.filter(
            (m) => answers.get(m.user_id) === "decline",
          );
          const waiting = members.filter((m) => !answers.has(m.user_id));
          const busyIds = new Set(
            busy
              .filter((b) =>
                overlaps(
                  b.starts_at,
                  b.ends_at,
                  option.starts_at,
                  option.ends_at,
                ),
              )
              .map((b) => b.user_id),
          );
          const everyoneIn = yes.length === members.length;
          const mine = answers.get(me);
          const label = formatRange(option.starts_at, option.ends_at);

          return (
            <View
              key={option.id}
              style={[styles.card, everyoneIn && styles.cardHighlight]}
            >
              <View style={styles.cardHeader}>
                <ThemedText style={{ fontWeight: "600" }}>{label}</ThemedText>
                {everyoneIn && (
                  <ThemedText style={styles.badge}>Everyone's in</ThemedText>
                )}
              </View>
              {option.suggested_by &&
                option.suggested_by !== event.created_by && (
                  <ThemedText muted style={styles.small}>
                    Suggested by {nameOf(option.suggested_by)}
                  </ThemedText>
                )}
              <ThemedText style={styles.small}>
                ✓{" "}
                {yes.length
                  ? yes.map((m) => m.profiles?.display_name).join(", ")
                  : "—"}
              </ThemedText>
              {no.length > 0 && (
                <ThemedText style={styles.small}>
                  ✕ {no.map((m) => m.profiles?.display_name).join(", ")}
                </ThemedText>
              )}
              {waiting.length > 0 && (
                <ThemedText muted style={styles.small}>
                  Waiting for{" "}
                  {waiting
                    .map(
                      (m) =>
                        `${m.profiles?.display_name}${busyIds.has(m.user_id) ? " (busy)" : ""}`,
                    )
                    .join(", ")}
                </ThemedText>
              )}
              <View style={styles.answerRow}>
                {(["accept", "decline"] as const).map((response) => {
                  const selected = mine === response;
                  return (
                    <Pressable
                      key={response}
                      onPress={() => answer(option.id, mine, response)}
                      style={[styles.answer, selected && styles.answerSelected]}
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
                        {response === "accept" ? "I can" : "I can't"}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              {canManage && (
                <Button
                  title="Confirm this date"
                  variant="secondary"
                  onPress={() => confirm(option.id, label)}
                />
              )}
            </View>
          );
        })}

      {event.status === "proposed" &&
        (suggesting ? (
          <View style={styles.card}>
            <ThemedText style={{ fontWeight: "600" }}>
              Suggest another time
            </ThemedText>
            <DateTimeField
              label="Date"
              mode="date"
              value={sDate}
              onChange={setSDate}
              minimumDate={new Date()}
            />
            <DateTimeField
              label="Start"
              mode="time"
              value={sStart}
              onChange={setSStart}
            />
            <DateTimeField
              label="End"
              mode="time"
              value={sEnd}
              onChange={setSEnd}
            />
            <Button title="Suggest" onPress={suggest} />
            <Button
              title="Never mind"
              variant="secondary"
              onPress={() => setSuggesting(false)}
            />
          </View>
        ) : (
          <Button
            title="None of these work? Suggest another time"
            variant="secondary"
            onPress={() => setSuggesting(true)}
          />
        ))}

      {/* Confirmed: attendance */}
      {event.status === "confirmed" && (
        <AttendanceSection
          eventId={id}
          members={members}
          requestAnswers={requestAnswers}
          refreshKey={refreshKey}
        />
      )}

      {/* Who brings what (module) */}
      {event.status !== "cancelled" && modules.has("bring_items") && (
        <BringItemsSection
          eventId={id}
          members={members}
          canManage={canManage}
          refreshKey={refreshKey}
        />
      )}

      {canManage && event.status !== "cancelled" && (
        <Button
          title={
            event.status === "proposed" ? "Cancel request" : "Cancel event"
          }
          variant="danger"
          onPress={cancel}
        />
      )}
    </ScrollView>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    container: { padding: 24, gap: 20 },
    heading: { fontSize: 26, fontWeight: "700" },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      gap: 8,
      borderWidth: 2,
      borderColor: "transparent",
    },
    cardHighlight: { borderColor: colors.accent },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    badge: { color: colors.accent, fontWeight: "700", fontSize: 13 },
    small: { fontSize: 14 },
    answerRow: { flexDirection: "row", gap: 8, marginTop: 4 },
    answer: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    answerSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
  });
