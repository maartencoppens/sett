import { TEMPLATES } from "@/constants/templates";
import { supabase } from "@/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

type Invite = {
  group_id: string;
  group_name: string;
  template: string;
  already_member: boolean;
};

export default function Join() {
  const { code } = useLocalSearchParams<{ code: string }>();
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
    setJoining(false);
    if (error) return Alert.alert("Could not join", error.message);
    router.replace(`/groups/${groupId}`);
  }

  if (invite === undefined) return <ActivityIndicator style={{ flex: 1 }} />;

  if (invite === null) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text style={{ fontSize: 17, textAlign: "center" }}>
          This invite is invalid or has expired.
        </Text>
      </View>
    );
  }

  const templateLabel =
    TEMPLATES.find((t) => t.key === invite.template)?.label ?? invite.template;

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 16,
      }}
    >
      <Text style={{ color: "#888" }}>{templateLabel}</Text>
      <Text style={{ fontSize: 26, fontWeight: "700", textAlign: "center" }}>
        {invite.group_name}
      </Text>
      <Pressable
        onPress={
          invite.already_member
            ? () => router.replace(`/groups/${invite.group_id}`)
            : join
        }
        disabled={joining}
        style={{
          backgroundColor: "#222",
          borderRadius: 8,
          paddingVertical: 14,
          paddingHorizontal: 32,
          opacity: joining ? 0.5 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          {invite.already_member
            ? "Open group"
            : joining
              ? "Joining…"
              : "Join group"}
        </Text>
      </Pressable>
    </View>
  );
}
