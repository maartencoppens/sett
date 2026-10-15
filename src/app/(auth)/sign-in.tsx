import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ThemedText } from "@/components/ui/themed-text";
import { supabase } from "@/lib/supabase";
import { useTheme, type Theme } from "@/lib/theme";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";

export default function SignIn() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) Alert.alert("Sign in failed", error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() } },
      });
      if (error) Alert.alert("Sign up failed", error.message);
      else if (!data.session)
        Alert.alert("Check your email to confirm your account.");
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ThemedText style={styles.title}>Sett</ThemedText>

      {mode === "sign-up" && (
        <TextField
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
        />
      )}
      <TextField
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        textContentType={mode === "sign-in" ? "password" : "newPassword"}
      />

      <Button
        title={mode === "sign-in" ? "Sign in" : "Create account"}
        onPress={submit}
        loading={loading}
      />

      <Pressable
        onPress={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        accessibilityRole="button"
      >
        <ThemedText style={styles.switch}>
          {mode === "sign-in"
            ? "No account yet? Sign up"
            : "Already have an account? Sign in"}
        </ThemedText>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      gap: 12,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 32,
      fontWeight: "700",
      marginBottom: 12,
      color: colors.accent,
    },
    switch: { textAlign: "center", marginTop: 8, color: colors.textMuted },
  });
