import { TEMPLATES, type TemplateKey } from "@/constants/templates";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

export default function NewGroup() {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<TemplateKey>("band");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!name.trim()) return Alert.alert("Give your group a name");
    setSaving(true);
    const { error } = await supabase.rpc("create_group", {
      p_name: name.trim(),
      p_template: template,
    });
    setSaving(false);
    if (error) return Alert.alert("Could not create group", error.message);
    router.back();
  }

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
        placeholder="e.g. The Basement Sessions"
        maxLength={60}
        autoFocus
      />

      <Text style={styles.label}>What kind of group?</Text>
      {TEMPLATES.map((t) => {
        const selected = t.key === template;
        return (
          <Pressable
            key={t.key}
            onPress={() => setTemplate(t.key)}
            style={[styles.option, selected && styles.optionSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={styles.optionTitle}>{t.label}</Text>
            <Text style={styles.optionText}>{t.description}</Text>
          </Pressable>
        );
      })}

      <Pressable
        style={[styles.button, saving && { opacity: 0.5 }]}
        onPress={create}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Creating…" : "Create group"}
        </Text>
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
  option: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 14,
    gap: 2,
  },
  optionSelected: { borderColor: "#222", borderWidth: 2 },
  optionTitle: { fontSize: 16, fontWeight: "600" },
  optionText: { color: "#666" },
  button: {
    backgroundColor: "#222",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
