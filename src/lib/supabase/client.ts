import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import type { Database } from "./database.types";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing Supabase env vars. Check .env and restart with `npx expo start -c`.",
  );
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: AsyncStorage, // no cookies on mobile: the session lives on the device
    autoRefreshToken: true,
    persistSession: true, // stay logged in after closing the app
    detectSessionInUrl: false, // no browser URL bar to read tokens from
  },
});

// The OS pauses JS timers when the app is in the background,
// so only refresh tokens while the app is in the foreground.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
