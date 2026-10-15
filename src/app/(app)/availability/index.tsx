import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Tables } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { WEEKDAYS } from "@/lib/availability";
import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";

type Block = Tables<"availability_blocks">;

const hhmm = (time: string | null) => time?.slice(0, 5) ?? "";

function describe(block: Block) {
  if (block.repeat === "weekly") {
    const day = WEEKDAYS.find((d) => d.iso === block.weekday)?.short;
    const until = block.until_date
      ? ` · until ${new Date(block.until_date).toLocaleDateString()}`
      : "";
    return `Every ${day} · ${hhmm(block.start_time)}–${hhmm(block.end_time)}${until}`;
  }
  const start = new Date(block.starts_at!);
  const end = new Date(block.ends_at!);
  const fmt: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${start.toLocaleString(undefined, fmt)} → ${end.toLocaleString(undefined, fmt)}`;
}

export default function Availability() {
  const { colors } = useTheme();
  const [blocks, setBlocks] = useState<Block[]>([]);

  const load = useCallback(() => {
    supabase
      .from("availability_blocks")
      .select("*")
      .order("weekday", { nullsFirst: false })
      .order("start_time")
      .order("starts_at")
      .then(({ data, error }) => {
        if (error) return console.warn(error.message);
        const now = Date.now();
        // hide one-off blocks that are over
        setBlocks(
          (data ?? []).filter(
            (b) =>
              b.repeat === "weekly" || new Date(b.ends_at!).getTime() > now,
          ),
        );
      });
  }, []);

  useFocusEffect(load);

  function remove(block: Block) {
    Alert.alert("Remove this busy time?", describe(block), [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("availability_blocks")
            .delete()
            .eq("id", block.id);
          if (error) return Alert.alert("Could not remove", error.message);
          load();
        },
      },
    ]);
  }

  const weekly = blocks.filter((b) => b.repeat === "weekly");
  const oneOff = blocks.filter((b) => b.repeat === "none");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText muted>
        Your groups only see when you're busy, never the labels.
      </ThemedText>

      {[
        { title: "Every week", items: weekly },
        { title: "Upcoming", items: oneOff },
      ].map((section) => (
        <View key={section.title} style={{ gap: 4 }}>
          <ThemedText muted style={styles.sectionTitle}>
            {section.title}
          </ThemedText>
          {section.items.length === 0 && (
            <ThemedText muted>Nothing yet</ThemedText>
          )}
          {section.items.map((block) => (
            <Pressable
              key={block.id}
              onLongPress={() => remove(block)}
              accessibilityHint="Long press to remove"
              style={[styles.item, { borderBottomColor: colors.border }]}
            >
              <ThemedText>{describe(block)}</ThemedText>
              {!!block.label && <ThemedText muted>{block.label}</ThemedText>}
            </Pressable>
          ))}
        </View>
      ))}

      <Button
        title="Add busy time"
        onPress={() => router.push("/availability/new")}
      />
      <ThemedText muted style={{ textAlign: "center", fontSize: 13 }}>
        Long press an item to remove it
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "600" },
  item: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
});
