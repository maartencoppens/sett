import { useTheme } from "@/lib/theme";
import { TextInput, type TextInputProps } from "react-native";

export function TextField({ style, ...props }: TextInputProps) {
  const { colors, scheme } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      keyboardAppearance={scheme} // dark keyboard in dark mode (iOS)
      {...props}
      style={[
        {
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          color: colors.text,
          borderRadius: 10,
          padding: 12,
          fontSize: 16,
        },
        style,
      ]}
    />
  );
}
