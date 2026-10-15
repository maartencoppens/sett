import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
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
type Item = {
  id: string;
  label: string;
  assigned_to: string | null;
  created_by: string | null;
};

type Props = {
  eventId: string;
  members: Member[];
  canManage: boolean;
  refreshKey: number;
};

export function BringItemsSection({
  eventId,
  members,
  canManage,
  refreshKey,
}: Props) {
  const { session } = useSession();
  const me = session!.user.id;
  const { colors } = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [newLabel, setNewLabel] = useState("");

  const load = useCallback(() => {
    supabase
      .from("bring_items")
      .select("id, label, assigned_to, created_by")
      .eq("event_id", eventId)
      .order("created_at")
      .then(({ data }) => setItems(data ?? []));
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const nameOf = (userId: string) =>
    userId === me
      ? "You"
      : (members.find((m) => m.user_id === userId)?.profiles?.display_name ??
        "Someone");

  async function add() {
    const label = newLabel.trim();
    if (!label) return;
    const { error } = await supabase
      .from("bring_items")
      .insert({ event_id: eventId, label });
    if (error) return Alert.alert("Could not add item", error.message);
    setNewLabel("");
    load();
  }

  async function claim(item: Item) {
    // .is('assigned_to', null): only succeeds if nobody claimed it in the meantime
    const { data, error } = await supabase
      .from("bring_items")
      .update({ assigned_to: me })
      .eq("id", item.id)
      .is("assigned_to", null)
      .select("id");
    if (error) return Alert.alert("Could not claim", error.message);
    if (!data?.length)
      Alert.alert("Too late", "Someone else just said they would bring it.");
    load();
  }

  async function release(item: Item) {
    const { error } = await supabase
      .from("bring_items")
      .update({ assigned_to: null })
      .eq("id", item.id)
      .eq("assigned_to", me);
    if (error) return Alert.alert("Could not update", error.message);
    load();
  }

  function remove(item: Item) {
    if (item.created_by !== me && !canManage) return;
    Alert.alert("Remove item?", item.label, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("bring_items")
            .delete()
            .eq("id", item.id);
          if (error) return Alert.alert("Could not remove", error.message);
          load();
        },
      },
    ]);
  }

  return (
    <View style={styles.section}>
      <ThemedText muted style={styles.title}>
        Who brings what
      </ThemedText>

      {items.length === 0 && (
        <ThemedText muted>Nothing on the list yet</ThemedText>
      )}

      {items.map((item) => (
        <Pressable
          key={item.id}
          onLongPress={() => remove(item)}
          style={[styles.item, { borderBottomColor: colors.border }]}
          accessibilityHint="Long press to remove"
        >
          <View style={{ flex: 1 }}>
            <ThemedText>{item.label}</ThemedText>
            {item.assigned_to && (
              <ThemedText muted style={{ fontSize: 14 }}>
                {nameOf(item.assigned_to)}
              </ThemedText>
            )}
          </View>
          {!item.assigned_to && (
            <Pressable onPress={() => claim(item)} accessibilityRole="button">
              <ThemedText style={{ color: colors.accent, fontWeight: "600" }}>
                I'll bring it
              </ThemedText>
            </Pressable>
          )}
          {item.assigned_to === me && (
            <Pressable onPress={() => release(item)} accessibilityRole="button">
              <ThemedText muted>Undo</ThemedText>
            </Pressable>
          )}
        </Pressable>
      ))}

      <View style={styles.addRow}>
        <View style={{ flex: 1 }}>
          <TextField
            value={newLabel}
            onChangeText={setNewLabel}
            placeholder="e.g. Bass amp, PA cables, snacks"
            maxLength={80}
            returnKeyType="done"
            onSubmitEditing={add}
          />
        </View>
        <Button title="Add" variant="secondary" onPress={add} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  title: { fontSize: 14, fontWeight: "600" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
