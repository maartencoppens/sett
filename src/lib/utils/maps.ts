import { Linking, Platform } from "react-native";

/** Opens the platform's maps app with a search for this place. */
export function openInMaps(query: string) {
  const q = encodeURIComponent(query);
  const native = Platform.select({
    ios: `https://maps.apple.com/?q=${q}`,
    default: `geo:0,0?q=${q}`,
  });
  Linking.openURL(native).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`),
  );
}
