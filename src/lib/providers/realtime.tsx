import { useActiveGroup } from "@/lib/providers/active-group";
import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";

/** table '*' means: "might have missed something, reload everything" */
export type GroupChange = {
  group_id: string;
  table: string;
  event_id: string | null;
};
type Listener = (change: GroupChange) => void;

const RealtimeContext = createContext<{
  subscribe: (listener: Listener) => () => void;
} | null>(null);

export function RealtimeProvider({ children }: PropsWithChildren) {
  const { groups } = useActiveGroup();
  const listeners = useRef(new Set<Listener>());
  const groupIds = groups
    .map((g) => g.id)
    .sort()
    .join(","); // stable dependency

  const emit = (change: GroupChange) =>
    listeners.current.forEach((listener) => listener(change));

  // One private channel per group the user belongs to
  useEffect(() => {
    if (!groupIds) return;
    const ids = groupIds.split(",");
    let channels: RealtimeChannel[] = [];
    let cancelled = false;

    supabase.realtime.setAuth().then(() => {
      // setAuth sends the user's token, needed for private channels
      if (cancelled) return;
      channels = ids.map((groupId) =>
        supabase
          .channel(`group:${groupId}`, { config: { private: true } })
          .on("broadcast", { event: "changed" }, ({ payload }) =>
            emit({
              group_id: groupId,
              table: payload.table,
              event_id: payload.event_id ?? null,
            }),
          )
          .subscribe(),
      );
    });

    return () => {
      cancelled = true;
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [groupIds]);

  // Broadcasts aren't stored: after the app was in the background, assume we missed some
  useEffect(() => {
    if (!groupIds) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        groupIds
          .split(",")
          .forEach((groupId) =>
            emit({ group_id: groupId, table: "*", event_id: null }),
          );
      }
    });
    return () => subscription.remove();
  }, [groupIds]);

  const value = useMemo(
    () => ({
      subscribe: (listener: Listener) => {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
    }),
    [],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Run onChange when a matching change arrives. Bursts are combined: creating a request
 * changes many rows at once, but you reload only once.
 */
export function useGroupChanges(
  matches: (change: GroupChange) => boolean,
  onChange: () => void,
  delayMs = 300,
) {
  const context = use(RealtimeContext);
  const latest = useRef({ matches, onChange });
  latest.current = { matches, onChange }; // always call the newest callbacks, without resubscribing

  useEffect(() => {
    if (!context) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = context.subscribe((change) => {
      if (!latest.current.matches(change)) return;
      clearTimeout(timer);
      timer = setTimeout(() => latest.current.onChange(), delayMs);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [context, delayMs]);
}
