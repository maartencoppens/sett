import { useSession } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

export type GroupSummary = {
  id: string;
  name: string;
  template: string;
  accent_color: string;
  logo_path: string | null;
};

type ActiveGroupState = {
  groups: GroupSummary[];
  activeGroup: GroupSummary | null;
  isLoading: boolean;
  setActiveGroup: (id: string) => void;
  refresh: () => Promise<void>;
};

const ActiveGroupContext = createContext<ActiveGroupState | null>(null);

export function ActiveGroupProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const userId = session?.user.id;
  const storageKey = userId ? `sett.activeGroup.${userId}` : null;

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // Derived, not stored: avoids a one-frame gap where the splash hides too early
  const isLoading = !!storageKey && loadedKey !== storageKey;

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, template, accent_color, logo_path")
      .is("archived_at", null)
      .order("created_at");
    if (error) return console.warn(error.message);
    setGroups(data);
  }, [userId]);

  useEffect(() => {
    if (!storageKey) {
      setGroups([]);
      setActiveId(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      AsyncStorage.getItem(storageKey)
        .then((id) => {
          if (!cancelled) setActiveId(id);
        })
        .catch(() => {}),
      refresh(),
    ]).finally(() => {
      if (!cancelled) setLoadedKey(storageKey);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey, refresh]);

  const setActiveGroup = useCallback(
    (id: string) => {
      setActiveId(id);
      if (storageKey) AsyncStorage.setItem(storageKey, id).catch(() => {});
    },
    [storageKey],
  );

  // Fall back to the first group if the saved one is gone (left, archived)
  const activeGroup =
    groups.find((g) => g.id === activeId) ?? groups[0] ?? null;

  return (
    <ActiveGroupContext.Provider
      value={{ groups, activeGroup, isLoading, setActiveGroup, refresh }}
    >
      {children}
    </ActiveGroupContext.Provider>
  );
}

export function useActiveGroup() {
  const value = use(ActiveGroupContext);
  if (!value)
    throw new Error("useActiveGroup must be used inside <ActiveGroupProvider>");
  return value;
}
