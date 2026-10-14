import { useSession } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

export default function Home() {
  const { session } = useSession();
  const [name, setName] = useState<string | null>(null);
  type GroupRow = { id: string; name: string; template: string };
  const [groups, setGroups] = useState<GroupRow[]>([]);
  // Runs every time this screen comes back into view, not just on mount
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => setName(data?.display_name ?? null));
      supabase
        .from("groups")
        .select("id, name, template")
        .is("archived_at", null)
        .order("created_at")
        .then(({ data }) => setGroups(data ?? []));
    }, [session]),
  );

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <Text style={{ fontSize: 22 }}>Welcome, {name ?? "…"}</Text>
      <Link href="/profile" style={{ color: "#06c", fontSize: 16 }}>
        Edit profile
      </Link>
      <Pressable onPress={() => supabase.auth.signOut()}>
        <Text style={{ color: "#c00" }}>Sign out</Text>
      </Pressable>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <Text style={{ fontSize: 18, paddingVertical: 6 }}>
            {item.name} <Text style={{ color: "#888" }}>· {item.template}</Text>
          </Text>
        )}
        ListEmptyComponent={
          <Text style={{ color: "#888" }}>No groups yet</Text>
        }
        style={{ flexGrow: 0 }}
      />
      <Link href="/groups/new" style={{ color: "#06c", fontSize: 16 }}>
        + New group
      </Link>
    </View>
  );
}
