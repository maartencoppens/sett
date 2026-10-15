import { useTheme } from "@/lib/providers/theme";
import { ActivityIndicator, Pressable, Text } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
}: Props) {
  const { colors } = useTheme();
  const background = variant === "primary" ? colors.accent : "transparent";
  const foreground =
    variant === "primary"
      ? colors.onAccent
      : variant === "danger"
        ? colors.danger
        : colors.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => ({
        backgroundColor: background,
        borderRadius: 10,
        padding: 14,
        alignItems: "center",
        opacity: disabled || loading ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={{ color: foreground, fontSize: 16, fontWeight: "600" }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
