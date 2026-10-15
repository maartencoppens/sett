import { useActiveGroup } from "@/lib/active-group";
import { useSession } from "@/lib/auth-context";
import { SplashScreen } from "expo-router";

SplashScreen.preventAutoHideAsync();

export function SplashScreenController() {
  const { isLoading: sessionLoading } = useSession();
  const { isLoading: groupsLoading } = useActiveGroup();
  if (!sessionLoading && !groupsLoading) SplashScreen.hide();
  return null;
}
