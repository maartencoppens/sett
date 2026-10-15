import { syncDeviceCalendars } from "@/lib/features/device-calendar";
import { useSession } from "@/lib/providers/session";
import { useEffect } from "react";
import { AppState } from "react-native";

/** Sync when the app starts and every time it comes back to the foreground. */
export function useDeviceCalendarSync() {
    const { session } = useSession();
    const userId = session?.user.id;

    useEffect(() => {
        if (!userId) return;
        syncDeviceCalendars(userId);
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") syncDeviceCalendars(userId);
        });
        return () => subscription.remove();
    }, [userId]);
}
