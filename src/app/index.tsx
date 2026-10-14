import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function Home() {
  const [status, setStatus] = useState("Checking Supabase…");

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    })
      .then((r) =>
        setStatus(r.ok ? "Sett ↔ Supabase connected ✓" : `HTTP ${r.status}`),
      )
      .catch((e) => setStatus(`Network error: ${e.message}`));
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 18 }}>{status}</Text>
    </View>
  );
}
