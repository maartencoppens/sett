import { useTheme } from "@/lib/theme";
import { Text, type TextProps } from "react-native";

export function ThemedText({
  muted,
  style,
  ...props
}: TextProps & { muted?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      style={[
        { color: muted ? colors.textMuted : colors.text, fontSize: 16 },
        style,
      ]}
    />
  );
}
