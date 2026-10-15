import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/lib/theme";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Platform, Pressable, StyleSheet, View } from "react-native";

type Props = {
  label: string;
  value: Date;
  mode: "date" | "time";
  onChange: (value: Date) => void;
  minimumDate?: Date;
};

export function DateTimeField({
  label,
  value,
  mode,
  onChange,
  minimumDate,
}: Props) {
  const { colors, scheme } = useTheme();

  const formatted =
    mode === "date"
      ? value.toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
      : value.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });

  // Android: open the system dialog imperatively, like Alert.alert()
  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value,
      mode,
      is24Hour: true,
      minimumDate,
      onValueChange: (_event, date) => {
        if (date) onChange(date);
      },
    });
  }

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <ThemedText>{label}</ThemedText>

      {Platform.OS === "ios" ? (
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          minimumDate={minimumDate}
          onValueChange={(_event, date) => {
            if (date) onChange(date);
          }}
          accentColor={colors.accent}
          themeVariant={scheme}
        />
      ) : (
        <Pressable
          onPress={openAndroidPicker}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${formatted}`}
        >
          <ThemedText style={{ color: colors.accent }}>{formatted}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
