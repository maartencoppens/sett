import { useSession } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { QueryData } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import {
  Stack,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Share, Text, View } from "react-native";

const membersQuery = (groupId: string) =>
  supabase
    .from("group_members")
    .select("user_id, role, profiles(display_name, instruments)")
    .eq("group_id", groupId)
    .order("joined_at");

type Members = QueryData<ReturnType<typeof membersQuery>>;

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Members>([]);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from("groups")
        .select("name")
        .eq("id", id)
        .single()
        .then(({ data }) => setName(data?.name ?? ""));
      membersQuery(id).then(({ data, error }) => {
        if (error) console.warn(error.message);
        setMembers(data ?? []);
      });
    }, [id]),
  );

  const isAdmin = members.some(
    (m) => m.user_id === session?.user.id && m.role === "admin",
  );

  async function invite() {
    const { data: code, error } = await supabase.rpc("create_invite", {
      p_group_id: id,
    });
    if (error || !code)
      return Alert.alert("Could not create invite", error?.message);
    const url = Linking.createURL(`/join/${code}`);
    await Share.share({
      message: `Join ${name} on Sett!\nCode: ${code}\n${url}`,
    });
  }

  function leave() {
    Alert.alert("Leave group?", `You'll lose access to ${name}.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("group_members")
            .delete()
            .eq("group_id", id)
            .eq("user_id", session!.user.id);
          if (error) return Alert.alert("Could not leave", error.message);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Stack.Screen options={{ title: name || "Group" }} />

      <Text style={{ fontSize: 14, fontWeight: "600", color: "#555" }}>
        Members
      </Text>
      <FlatList
        data={members}
        keyExtractor={(m) => m.user_id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 8 }}>
            <Text style={{ fontSize: 17 }}>
              {item.profiles?.display_name ?? "Unnamed"}
              {item.role === "admin" && (
                <Text style={{ color: "#888" }}> · admin</Text>
              )}
            </Text>
            {!!item.profiles?.instruments.length && (
              <Text style={{ color: "#666" }}>
                {item.profiles.instruments.join(", ")}
              </Text>
            )}
          </View>
        )}
        style={{ flexGrow: 0 }}
      />

      {isAdmin && (
        <Pressable
          onPress={invite}
          style={{
            backgroundColor: "#222",
            borderRadius: 8,
            padding: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            Invite someone
          </Text>
        </Pressable>
      )}
      <Pressable onPress={leave}>
        <Text style={{ color: "#c00", textAlign: "center" }}>Leave group</Text>
      </Pressable>
    </View>
  );
}
