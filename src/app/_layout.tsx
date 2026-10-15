import { SplashScreenController } from "@/components/splash-screen-controller";
import {
  ActiveGroupProvider,
  useActiveGroup,
} from "@/lib/providers/active-group";
import { SessionProvider, useSession } from "@/lib/providers/session";
import { AppThemeProvider, useTheme } from "@/lib/providers/theme";
import { Stack } from "expo-router";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { useMemo, type PropsWithChildren } from "react";

export default function RootLayout() {
  return (
    <SessionProvider>
      <ActiveGroupProvider>
        <SplashScreenController />
        <ThemedRoot />
      </ActiveGroupProvider>
    </SessionProvider>
  );
}

function ThemedRoot() {
  const { activeGroup } = useActiveGroup();
  return (
    <AppThemeProvider accent={activeGroup?.accent_color}>
      <NavigationTheme>
        <RootNavigator />
      </NavigationTheme>
      <StatusBar style="auto" />
    </AppThemeProvider>
  );
}

// Headers, back buttons and screen backgrounds take their colours from this
function NavigationTheme({ children }: PropsWithChildren) {
  const { scheme, colors } = useTheme();
  const navTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [scheme, colors]);
  return <ThemeProvider value={navTheme}>{children}</ThemeProvider>;
}

function RootNavigator() {
  const { session } = useSession();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
