import {
  DEFAULT_ACCENT,
  NEUTRALS,
  PALETTE,
  isAccentKey,
  type AccentKey,
} from "@/constants/palette";
import { createContext, use, useMemo, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";

type Scheme = "light" | "dark";

function buildTheme(scheme: Scheme, accentKey: AccentKey) {
  return {
    scheme,
    colors: {
      ...NEUTRALS[scheme],
      accent: PALETTE[accentKey][scheme],
      onAccent: scheme === "dark" ? "#0B0B0F" : "#FFFFFF",
    },
  };
}

export type Theme = ReturnType<typeof buildTheme>;

const ThemeContext = createContext<Theme | null>(null);

export function AppThemeProvider({
  accent,
  children,
}: PropsWithChildren<{ accent?: string | null }>) {
  const scheme: Scheme = useColorScheme() === "dark" ? "dark" : "light";
  const key = isAccentKey(accent) ? accent : DEFAULT_ACCENT;
  const theme = useMemo(() => buildTheme(scheme, key), [scheme, key]);
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = use(ThemeContext);
  if (!theme)
    throw new Error("useTheme must be used inside <AppThemeProvider>");
  return theme;
}
