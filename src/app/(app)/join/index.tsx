import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ThemedText } from "@/components/ui/themed-text";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

export default function EnterCode() {
  const [code, setCode] = useState("");
  const go = () => {
    if (code.trim()) router.push(`/join/${code.trim()}`);
  };

  return (
    <View style={styles.container}>
      <ThemedText>Enter the invite code you received</ThemedText>
      <TextField
        value={code}
        onChangeText={setCode}
        placeholder="7F3A9C21B4"
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={go}
        style={styles.codeInput}
      />
      <Button title="Continue" onPress={go} disabled={!code.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  codeInput: { fontSize: 20, letterSpacing: 2 },
});
