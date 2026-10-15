import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ThemedText } from "@/components/ui/themed-text";
import { TEMPLATES, type TemplateKey } from "@/constants/templates";
import { useActiveGroup } from "@/lib/providers/active-group";
import { useTheme, type Theme } from "@/lib/providers/theme";
import { supabase } from "@/lib/supabase/client";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet } from "react-native";

export default function NewGroup() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { refresh, setActiveGroup } = useActiveGroup();

  const [name, setName] = useState("");
  const [template, setTemplate] = useState<TemplateKey>("band");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!name.trim()) return Alert.alert("Give your group a name");

    setSaving(true);
    const { data: groupId, error } = await supabase.rpc("create_group", {
      p_name: name.trim(),
      p_template: template,
    });
    if (error) {
      setSaving(false);
      return Alert.alert("Could not create group", error.message);
    }

    await refresh(); // first load the new group into the list…
    setActiveGroup(groupId); // …then make it active
    setSaving(false);
    router.back();
  }

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
        placeholder="e.g. The Basement Sessions"
        maxLength={60}
        autoFocus
      />

      <ThemedText muted style={styles.label}>
        What kind of group?
      </ThemedText>
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
            <ThemedText style={styles.optionTitle}>{t.label}</ThemedText>
            <ThemedText muted>{t.description}</ThemedText>
          </Pressable>
        );
      })}

      <Button title="Create group" onPress={create} loading={saving} />
    </ScrollView>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    container: { padding: 24, gap: 12 },
    label: { fontSize: 14, fontWeight: "600", marginTop: 8 },
    option: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      gap: 2,
    },
    optionSelected: { borderColor: colors.accent, borderWidth: 2 },
    optionTitle: { fontWeight: "600" },
  });
