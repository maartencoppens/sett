import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/lib/providers/theme";
import { StyleSheet, View } from "react-native";

type Props = {
  loadInAt: string | null;
  soundcheckAt: string | null;
  startsAt: string;
  endsAt: string;
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

export function GigSchedule({
  loadInAt,
  soundcheckAt,
  startsAt,
  endsAt,
}: Props) {
  const { colors } = useTheme();
  const rows = [
    { label: "Load-in", at: loadInAt },
    { label: "Soundcheck", at: soundcheckAt },
    { label: "Show", at: startsAt },
    { label: "End", at: endsAt },
  ].filter((row): row is { label: string; at: string } => !!row.at);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <ThemedText muted>{row.label}</ThemedText>
          <ThemedText
            style={{ fontWeight: "600", fontVariant: ["tabular-nums"] }}
          >
            {time(row.at)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
});
