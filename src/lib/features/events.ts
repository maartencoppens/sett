export const EVENT_TYPES = [
  { key: "rehearsal", label: "Rehearsal" },
  { key: "jam", label: "Jam" },
  { key: "gig", label: "Gig" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["key"];

export const eventTypeLabel = (type: string) =>
  EVENT_TYPES.find((t) => t.key === type)?.label ?? type;

/** Sensible default per group template */
export const defaultEventType = (template: string | undefined): EventType =>
  template === "jam" ? "jam" : "rehearsal";

/** "Tue 21 Oct · 19:00–22:00" */
export function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const day = start.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time(start)}–${time(end)}`;
}

export const overlaps = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) => new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart);
