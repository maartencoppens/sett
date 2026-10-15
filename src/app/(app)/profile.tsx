import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ThemedText } from "@/components/ui/themed-text";
import { INSTRUMENTS } from "@/constants/instruments";
import { useSession } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useTheme, type Theme } from "@/lib/theme";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

export default function Profile() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useSession();
  const userId = session!.user.id; // safe: (app) is only reachable with a session

  const [name, setName] = useState("");
  const [instruments, setInstruments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("display_name, instruments")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (error) Alert.alert("Could not load profile", error.message);
        if (data) {
          setName(data.display_name ?? "");
          setInstruments(data.instruments);
        }
        setLoading(false);
      });
  }, [userId]);

  function toggle(instrument: string) {
    setInstruments((current) =>
      current.includes(instrument)
        ? current.filter((i) => i !== instrument)
        : [...current, instrument],
    );
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert("Please enter your name");

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed, instruments })
      .eq("id", userId)
      .select("id")
      .single();
    setSaving(false);

    if (error) return Alert.alert("Could not save", error.message);
    router.back();
  }

  if (loading)
    return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText muted style={styles.label}>
        Name
      </ThemedText>
      <TextField
        value={name}
        onChangeText={setName}
        maxLength={50}
        autoComplete="name"
        textContentType="name"
      />

      <ThemedText muted style={styles.label}>
        What do you play?
      </ThemedText>
      <View style={styles.chips}>
        {INSTRUMENTS.map((instrument) => {
          const selected = instruments.includes(instrument);
          return (
            <Pressable
              key={instrument}
              onPress={() => toggle(instrument)}
              style={[styles.chip, selected && styles.chipSelected]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
            >
              <ThemedText
                style={selected ? styles.chipTextSelected : undefined}
              >
                {instrument}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button title="Save" onPress={save} loading={saving} />
        <Button
          title="Sign out"
          variant="danger"
          onPress={() => supabase.auth.signOut()}
        />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    container: { padding: 24, gap: 12 },
    label: { fontSize: 14, fontWeight: "600", marginTop: 8 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    chipSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipTextSelected: { color: colors.onAccent },
    actions: { gap: 8, marginTop: 16 },
  });
