import { DEFAULT_ACCENT, isAccentKey, PALETTE } from "@/constants/palette";
import { eventTypeLabel } from "@/lib/features/events";
import { supabase } from "@/lib/supabase/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

const REMINDER_MINUTES = 60; // before the first call time
const HISTORY_DAYS = 30; // keep syncing events that ended up to 30 days ago
const DAY = 86_400_000;

type SyncState = {
    /** groupId → id of the calendar Sett created on this phone ('' = enabled, not yet created) */
    groups: Record<string, string>;
    /** Sett event id → phone event */
    events: Record<
        string,
        { deviceId: string; groupId: string; endsAt: string; signature: string }
    >;
};

const storageKey = (userId: string) => `sett.deviceCalendar.${userId}`;

async function loadState(userId: string): Promise<SyncState> {
    try {
        const raw = await AsyncStorage.getItem(storageKey(userId));
        return raw ? JSON.parse(raw) : { groups: {}, events: {} };
    } catch {
        return { groups: {}, events: {} };
    }
}

async function saveState(userId: string, state: SyncState) {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(state));
}

function forgetGroupEvents(state: SyncState, groupId: string) {
    for (const [id, mapped] of Object.entries(state.events)) {
        if (mapped.groupId === groupId) delete state.events[id];
    }
}

const colorFor = (accent: string) =>
    PALETTE[isAccentKey(accent) ? accent : DEFAULT_ACCENT].light;

// ---------- Permissions ----------

/** 'granted', 'denied' (ask again possible) or 'blocked' (only via Settings) */
export async function requestCalendarAccess(): Promise<
    "granted" | "denied" | "blocked"
> {
    const current = await Calendar.getCalendarPermissions();
    if (current.granted) return "granted";
    if (!current.canAskAgain) return "blocked";
    const result = await Calendar.requestCalendarPermissions();
    if (result.granted) return "granted";
    return result.canAskAgain ? "denied" : "blocked";
}

// ---------- Creating a calendar ----------

async function createDeviceCalendar(title: string, color: string) {
    if (Platform.OS === "ios") {
        // Put it next to the user's default calendar (usually iCloud, so it also shows on their Mac)
        const defaultCalendar = Calendar.getDefaultCalendarSync();
        return Calendar.createCalendar({
            title,
            color,
            entityType: Calendar.EntityTypes.EVENT,
            sourceId: defaultCalendar.source.id,
            source: defaultCalendar.source,
        });
    }
    // Android: a local calendar owned by the app
    return Calendar.createCalendar({
        title,
        color,
        name: "sett",
        ownerAccount: "Sett",
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
        isVisible: true,
        isSynced: true,
        source: { isLocalAccount: true, name: "Sett", type: "LOCAL" },
    });
}

// ---------- Turning an event into a phone event ----------

type SettEvent = {
    id: string;
    group_id: string;
    type: string;
    title: string | null;
    notes: string | null;
    venue: string | null;
    address: string | null;
    starts_at: string;
    ends_at: string;
    load_in_at: string | null;
    soundcheck_at: string | null;
};

function toDeviceEvent(e: SettEvent) {
    const start = new Date(e.starts_at);
    const firstCall = [e.load_in_at, e.soundcheck_at]
        .filter((d): d is string => !!d)
        .map((d) => new Date(d))
        .reduce((earliest, d) => (d < earliest ? d : earliest), start);
    const minutesBeforeStart = Math.round(
        (start.getTime() - firstCall.getTime()) / 60_000,
    );

    // Unlike the .ics feed, we're on the phone: local times are known here
    const time = (iso: string) =>
        new Date(iso).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
        });

    return {
        title: e.title
            ? (e.type === "gig" ? `Gig: ${e.title}` : e.title)
            : eventTypeLabel(e.type),
        startDate: start,
        endDate: new Date(e.ends_at),
        location: [e.venue, e.address].filter(Boolean).join(", ") || null,
        notes: [
            e.load_in_at && `Load-in: ${time(e.load_in_at)}`,
            e.soundcheck_at && `Soundcheck: ${time(e.soundcheck_at)}`,
            e.notes,
        ].filter(Boolean).join("\n"),
        alarms: [{ relativeOffset: -(minutesBeforeStart + REMINDER_MINUTES) }],
    };
}

// ---------- The sync itself ----------

let running: Promise<void> | null = null;

/** Safe to call often: concurrent calls share one run. */
export function syncDeviceCalendars(userId: string) {
    running ??= doSync(userId)
        .catch((error) => console.warn("Calendar sync failed", error))
        .finally(() => {
            running = null;
        });
    return running;
}

async function doSync(userId: string) {
    const state = await loadState(userId);
    const groupIds = Object.keys(state.groups);
    if (groupIds.length === 0) return;
    if (!(await Calendar.getCalendarPermissions()).granted) return;

    const cutoff = new Date(Date.now() - HISTORY_DAYS * DAY);
    const [{ data: groups }, { data: events }] = await Promise.all([
        supabase.from("groups").select("id, name, accent_color").in(
            "id",
            groupIds,
        ),
        supabase
            .from("events")
            .select(
                "id, group_id, type, title, notes, venue, address, starts_at, ends_at, load_in_at, soundcheck_at",
            )
            .in("group_id", groupIds)
            .eq("status", "confirmed")
            .gte("ends_at", cutoff.toISOString()),
    ]);
    // Offline or an error: leave the phone calendar exactly as it is
    if (!groups || !events) return;

    // 1. Make sure every enabled group has its calendar (recreate if the user deleted it)
    const existing = new Map(
        (await Calendar.getCalendars(Calendar.EntityTypes.EVENT)).map((
            c,
        ) => [c.id, c]),
    );
    const calendars = new Map<string, Calendar.ExpoCalendar>();

    for (const groupId of groupIds) {
        const group = groups.find((g) => g.id === groupId);
        const calendar = existing.get(state.groups[groupId]);

        if (!group) {
            // Left the group (RLS no longer returns it): remove its calendar
            await calendar?.delete();
            delete state.groups[groupId];
            forgetGroupEvents(state, groupId);
            continue;
        }

        const title = `${group.name} · Sett`;
        const color = colorFor(group.accent_color);
        if (!calendar) {
            const created = await createDeviceCalendar(title, color);
            state.groups[groupId] = created.id;
            forgetGroupEvents(state, groupId);
            calendars.set(groupId, created);
        } else {
            if (
                calendar.title !== title ||
                calendar.color?.toLowerCase() !== color.toLowerCase()
            ) {
                await calendar.update({ title, color });
            }
            calendars.set(groupId, calendar);
        }
    }

    // 2. What's on the phone right now
    const from = new Date(cutoff.getTime() - DAY);
    const to = new Date(Date.now() + 400 * DAY);
    const onPhone = new Map<string, Calendar.ExpoCalendarEvent>();
    for (const calendar of calendars.values()) {
        for (const event of await calendar.listEvents(from, to)) {
            onPhone.set(event.id, event);
        }
    }

    // Offline or an error: leave the phone calendar exactly as it is
    if (!groups || !events) return;

    // Confirmed events always have times (DB check constraint), but the generated types
    // follow the nullable columns. Narrow once here, so everything below is typed as SettEvent.
    const confirmed = events.filter(
        (e): e is SettEvent => e.starts_at !== null && e.ends_at !== null,
    );

    // 3. Create or update
    // 3. Create or update
    const wanted = new Set(confirmed.map((e) => e.id));
    for (const e of confirmed) {
        const calendar = calendars.get(e.group_id);
        if (!calendar) continue;
        const details = toDeviceEvent(e);
        const signature = JSON.stringify(details);
        const mapped = state.events[e.id];
        const phoneEvent = mapped && onPhone.get(mapped.deviceId);

        if (phoneEvent) {
            if (mapped.signature !== signature) {
                await phoneEvent.update(details);
                mapped.signature = signature;
                mapped.endsAt = e.ends_at;
            }
        } else {
            const created = await calendar.createEvent(details);
            state.events[e.id] = {
                deviceId: created.id,
                groupId: e.group_id,
                endsAt: e.ends_at,
                signature,
            };
        }
    }

    // 4. Remove cancelled events, but leave old history alone
    for (const [settId, mapped] of Object.entries(state.events)) {
        if (wanted.has(settId)) continue;
        if (new Date(mapped.endsAt) < cutoff) {
            delete state.events[settId]; // too old to track: keep it on the phone, forget the mapping
            continue;
        }
        await onPhone.get(mapped.deviceId)?.delete();
        delete state.events[settId];
    }

    await saveState(userId, state);
}

// ---------- Turning it on and off per group ----------

export async function isGroupSynced(userId: string, groupId: string) {
    return groupId in (await loadState(userId)).groups;
}

export async function enableGroup(userId: string, groupId: string) {
    const state = await loadState(userId);
    state.groups[groupId] ??= "";
    await saveState(userId, state);
    await syncDeviceCalendars(userId);
}

export async function disableGroup(userId: string, groupId: string) {
    const state = await loadState(userId);
    const calendarId = state.groups[groupId];
    if (calendarId) {
        const calendars = await Calendar.getCalendars(
            Calendar.EntityTypes.EVENT,
        );
        await calendars.find((c) => c.id === calendarId)?.delete();
    }
    delete state.groups[groupId];
    forgetGroupEvents(state, groupId);
    await saveState(userId, state);
}
