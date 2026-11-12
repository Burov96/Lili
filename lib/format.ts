import type { DateStr } from "./slots";

function utcDate(date: DateStr): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const longDate = new Intl.DateTimeFormat("bg-BG", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const shortWeekday = new Intl.DateTimeFormat("bg-BG", { weekday: "short", timeZone: "UTC" });
const dayNum = new Intl.DateTimeFormat("bg-BG", { day: "numeric", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("bg-BG", { month: "long", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric", timeZone: "UTC" });
const hourFmt = new Intl.DateTimeFormat("bg-BG", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("bg-BG", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Sofia",
});

/** „сряда, 12 ноември“ */
export const formatLongDate = (d: DateStr) => longDate.format(utcDate(d));
/** „ср“ */
export const formatWeekdayShort = (d: DateStr) => shortWeekday.format(utcDate(d)).replace(".", "");
/** „12“ */
export const formatDayNumber = (d: DateStr) => dayNum.format(utcDate(d));
/** „ное“ */
export const formatMonthShort = (d: DateStr) => monthLong.format(utcDate(d)).slice(0, 3);
/** „ноември 2026 г.“ */
export const formatMonthYear = (d: DateStr) => monthYear.format(utcDate(d));
/** Минути от полунощ → „15:30“ */
export const formatTime = (min: number) =>
  hourFmt.format(new Date(Date.UTC(2000, 0, 1, Math.floor(min / 60), min % 60))).replace(/\s*ч\.?$/, "");
/** Дата и час на създаване в софийско време. */
export const formatDateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));

const plural = new Intl.PluralRules("bg-BG");
/** „1 свободно място“ / „3 свободни места“ */
export function spotsLabel(n: number): string {
  return plural.select(n) === "one" ? `${n} свободно място` : `${n} свободни места`;
}
