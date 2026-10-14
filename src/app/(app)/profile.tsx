import { INSTRUMENTS } from "@/constants/instruments";
import { useSession } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

export default function Profile() {
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
      .single(); // errors if 0 rows were updated (see pitfall below)
    setSaving(false);

    if (error) return Alert.alert("Could not save", error.message);
    router.back();
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        maxLength={50}
        autoComplete="name"
        textContentType="name"
      />

      <Text style={styles.label}>What do you play?</Text>
      <ScrollView horizontal={false} contentContainerStyle={styles.chips}>
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
              <Text style={selected ? styles.chipTextSelected : undefined}>
                {instrument}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        style={[styles.button, saving && { opacity: 0.5 }]}
        onPress={save}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? "Saving…" : "Save"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#555", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: "#222", borderColor: "#222" },
  chipTextSelected: { color: "#fff" },
  button: {
    backgroundColor: "#222",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
