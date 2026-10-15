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
