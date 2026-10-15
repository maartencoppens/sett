import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import { DEFAULT_ACCENT, PALETTE, isAccentKey } from "@/constants/palette";
import { TEMPLATES } from "@/constants/templates";
import { eventTypeLabel, formatRange } from "@/lib/features/events";
import { useActiveGroup } from "@/lib/providers/active-group";
import { useGroupChanges } from "@/lib/providers/realtime";
import { useTheme } from "@/lib/providers/theme";
import { supabase } from "@/lib/supabase/client";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

export default function Home() {
  const { colors, scheme } = useTheme();
  const { groups, activeGroup, setActiveGroup, refresh } = useActiveGroup();
  type EventSummary = {
    id: string;
    type: string;
    title: string | null;
    starts_at: string | null;
    ends_at: string | null;
  };
  const [requests, setRequests] = useState<EventSummary[]>([]);
  const [upcoming, setUpcoming] = useState<EventSummary[]>([]);

  const loadEvents = useCallback(() => {
    if (!activeGroup) return;
    supabase
      .from("events")
      .select("id, type, title, starts_at, ends_at")
      .eq("group_id", activeGroup.id)
      .eq("status", "proposed")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRequests(data ?? []));
    supabase
      .from("events")
      .select("id, type, title, starts_at, ends_at")
      .eq("group_id", activeGroup.id)
      .eq("status", "confirmed")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(10)
      .then(({ data }) => setUpcoming(data ?? []));
  }, [activeGroup?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadEvents();
    }, [refresh, loadEvents]),
  );

  useGroupChanges(
    (change) =>
      change.group_id === activeGroup?.id &&
      ["events", "groups", "group_members", "*"].includes(change.table),
    () => {
      refresh();
      loadEvents();
    },
  );

  if (!activeGroup) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
        <ThemedText
          style={{ fontSize: 22, fontWeight: "700", textAlign: "center" }}
        >
          You're not in a group yet
        </ThemedText>
        <Button
          title="Create a group"
          onPress={() => router.push("/groups/new")}
        />
        <Button
          title="Join with a code"
          variant="secondary"
          onPress={() => router.push("/join")}
        />
      </View>
    );
  }

  const templateLabel = TEMPLATES.find(
    (t) => t.key === activeGroup.template,
  )?.label;
  const others = groups.filter((g) => g.id !== activeGroup.id);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View
        style={{
          backgroundColor: colors.accent,
          borderRadius: 16,
          padding: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Avatar
          bucket="group-logos"
          path={activeGroup.logo_path}
          name={activeGroup.name}
          size={56}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText style={{ color: colors.onAccent, opacity: 0.8 }}>
            {templateLabel}
          </ThemedText>
          <ThemedText
            style={{ color: colors.onAccent, fontSize: 26, fontWeight: "700" }}
            numberOfLines={2}
          >
            {activeGroup.name}
          </ThemedText>
        </View>
      </View>
      <Button
        title="+ Propose a date"
        onPress={() => router.push("/events/new")}
      />

      {requests.length > 0 && (
        <View style={{ gap: 4 }}>
          <ThemedText muted style={{ fontSize: 14, fontWeight: "600" }}>
            Open requests
          </ThemedText>
          {requests.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => router.push(`/events/${e.id}`)}
              style={{ paddingVertical: 10 }}
            >
              <ThemedText>{e.title ?? eventTypeLabel(e.type)}</ThemedText>
              <ThemedText muted style={{ fontSize: 14 }}>
                Waiting for answers
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ gap: 4 }}>
        <ThemedText muted style={{ fontSize: 14, fontWeight: "600" }}>
          Upcoming
        </ThemedText>
        {upcoming.length === 0 && (
          <ThemedText muted>Nothing planned yet</ThemedText>
        )}
        {upcoming.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => router.push(`/events/${e.id}`)}
            style={{ paddingVertical: 10 }}
          >
            <ThemedText>{e.title ?? eventTypeLabel(e.type)}</ThemedText>
            {e.starts_at && e.ends_at && (
              <ThemedText muted style={{ fontSize: 14 }}>
                {formatRange(e.starts_at, e.ends_at)}
              </ThemedText>
            )}
          </Pressable>
        ))}
      </View>
      <Button
        title="Members & settings"
        variant="secondary"
        onPress={() => router.push(`/groups/${activeGroup.id}`)}
      />
      <Button
        title="My availability"
        variant="secondary"
        onPress={() => router.push("/availability")}
      />
      {others.length > 0 && (
        <View style={{ gap: 4 }}>
          <ThemedText muted style={{ fontSize: 14, fontWeight: "600" }}>
            Switch group
          </ThemedText>
          {others.map((g) => {
            const key = isAccentKey(g.accent_color)
              ? g.accent_color
              : DEFAULT_ACCENT;
            return (
              <Pressable
                key={g.id}
                onPress={() => setActiveGroup(g.id)}
                accessibilityRole="button"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 10,
                }}
              >
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: PALETTE[key][scheme],
                  }}
                />
                <ThemedText>{g.name}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}

      <Button
        title="+ New group"
        variant="secondary"
        onPress={() => router.push("/groups/new")}
      />
      <Button
        title="Join with a code"
        variant="secondary"
        onPress={() => router.push("/join")}
      />
    </ScrollView>
  );
}
