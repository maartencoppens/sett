import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import { TEMPLATES } from "@/constants/templates";
import { useActiveGroup } from "@/lib/providers/active-group";
import { useTheme } from "@/lib/providers/theme";
import { supabase } from "@/lib/supabase/client";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

type Invite = {
  group_id: string;
  group_name: string;
  template: string;
  already_member: boolean;
};

export default function Join() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { refresh, setActiveGroup } = useActiveGroup();
  const { colors } = useTheme();

  const [invite, setInvite] = useState<Invite | null | undefined>(undefined); // undefined = loading
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    supabase
      .rpc("get_invite", { p_code: code })
      .then(({ data }) => setInvite(data?.[0] ?? null));
  }, [code]);

  async function join() {
    setJoining(true);
    const { data: groupId, error } = await supabase.rpc("join_group", {
      p_code: code,
    });
    if (error) {
      setJoining(false);
      return Alert.alert("Could not join", error.message);
    }
    await refresh();
    setActiveGroup(groupId);
    setJoining(false);
    router.replace(`/groups/${groupId}`);
  }

  function open() {
    setActiveGroup(invite!.group_id);
    router.replace(`/groups/${invite!.group_id}`);
  }

  if (invite === undefined)
    return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;

  if (invite === null) {
    return (
      <View style={styles.centered}>
        <ThemedText style={styles.message}>
          This invite is invalid or has expired.
        </ThemedText>
      </View>
    );
  }

  const templateLabel =
    TEMPLATES.find((t) => t.key === invite.template)?.label ?? invite.template;

  return (
    <View style={styles.centered}>
      <ThemedText muted>{templateLabel}</ThemedText>
      <ThemedText style={styles.groupName}>{invite.group_name}</ThemedText>
      <View style={styles.action}>
        <Button
          title={invite.already_member ? "Open group" : "Join group"}
          onPress={invite.already_member ? open : join}
          loading={joining}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  message: { fontSize: 17, textAlign: "center" },
  groupName: { fontSize: 26, fontWeight: "700", textAlign: "center" },
  action: { alignSelf: "stretch" },
});
