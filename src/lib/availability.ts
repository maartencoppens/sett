import { getCalendars } from "expo-localization";

export const WEEKDAYS = [
  { iso: 1, short: "Mon" },
  { iso: 2, short: "Tue" },
  { iso: 3, short: "Wed" },
  { iso: 4, short: "Thu" },
  { iso: 5, short: "Fri" },
  { iso: 6, short: "Sat" },
  { iso: 7, short: "Sun" },
] as const;

export function deviceTimeZone() {
  return getCalendars()[0]?.timeZone ?? "UTC";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Date → "19:00" (local wall-clock time) */
export const toTimeString = (d: Date) =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Date → "2026-12-31" (local calendar date) */
export const toDateString = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The date part of one Date combined with the time part of another */
export const combine = (date: Date, time: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes(),
  );

/** A Date at a given hour today, for sensible picker defaults */
export const todayAt = (hours: number) => {
  const d = new Date();
  d.setHours(hours, 0, 0, 0);
  return d;
};
