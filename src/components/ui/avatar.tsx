import type { ImageBucket } from "@/lib/features/images";
import { useSignedUrl } from "@/lib/hooks/use-signed-url";
import { useTheme } from "@/lib/providers/theme";
import { Image } from "expo-image";
import { Text, View } from "react-native";

type Props = {
  bucket: ImageBucket;
  path: string | null | undefined;
  name: string | null | undefined;
  size?: number;
};

export function Avatar({ bucket, path, name, size = 44 }: Props) {
  const { colors } = useTheme();
  const url = useSignedUrl(bucket, path);

  // Avatars are round, group logos are rounded squares
  const shape = {
    width: size,
    height: size,
    borderRadius: bucket === "avatars" ? size / 2 : size * 0.22,
  };

  if (url && path) {
    return (
      <Image
        source={{ uri: url, cacheKey: path }}
        style={shape}
        contentFit="cover"
        transition={150}
        accessibilityLabel={name ?? undefined}
      />
    );
  }

  const initials = (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        shape,
        {
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
      accessibilityLabel={name ?? undefined}
    >
      <Text
        style={{
          color: colors.accent,
          fontWeight: "700",
          fontSize: size * 0.38,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
