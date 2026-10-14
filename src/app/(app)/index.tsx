import { useSession } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function Home() {
  const { session } = useSession();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.warn(error.message);
        setName(data?.display_name ?? null);
      });
  }, [session]);

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
      <Pressable onPress={() => supabase.auth.signOut()}>
        <Text style={{ color: "#c00" }}>Sign out</Text>
      </Pressable>
    </View>
  );
}
