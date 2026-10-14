import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export default function EnterCode() {
  const [code, setCode] = useState("");
  const go = () => code.trim() && router.push(`/join/${code.trim()}`);

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 16 }}>Enter the invite code you received</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="7F3A9C21B4"
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={go}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          fontSize: 20,
          letterSpacing: 2,
        }}
      />
      <Pressable
        onPress={go}
        style={{
          backgroundColor: "#222",
          borderRadius: 8,
          padding: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          Continue
        </Text>
      </Pressable>
    </View>
  );
}
