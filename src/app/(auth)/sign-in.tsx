import { supabase } from "@/lib/supabase";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

export default function SignIn() {
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
        options: { data: { display_name: name.trim() } }, // picked up by the profile trigger
      });
      if (error) Alert.alert("Sign up failed", error.message);
      else if (!data.session)
        Alert.alert("Check your email to confirm your account.");
    }
    setLoading(false);
    // No router.push: the session changes and Stack.Protected switches screens.
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Sett</Text>

      {mode === "sign-up" && (
        <TextInput
          style={styles.input}
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        textContentType={mode === "sign-in" ? "password" : "newPassword"}
      />

      <Pressable
        style={[styles.button, loading && { opacity: 0.5 }]}
        onPress={submit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
      >
        <Text style={styles.switch}>
          {mode === "sign-in"
            ? "No account yet? Sign up"
            : "Already have an account? Sign in"}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#222",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switch: { textAlign: "center", marginTop: 8, color: "#555" },
});
