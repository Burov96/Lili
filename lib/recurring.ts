import { addDays, closedReasonFor, isWeekend, weekday, type DateStr } from "./slots";
import { slotKey, type Recurring, type Store } from "./store";

/** Едно конкретно посещение от повтаряща се поредица. */
export type Occurrence = {
  recurringId: number;
  date: DateStr;
  time: number;
  bookerName: string;
  patientName: string | null;
  phone: string;
  note: string | null;
};

/**
 * Разгръща правилата в конкретни посещения между `from` и `to` (вкл.).
 * Прескача уикенди, празници, ръчно затворени дни и пропуснатите дати.
 */
export function expandRecurring(
  rules: Recurring[],
  from: DateStr,
  to: DateStr,
  closedDays: Map<DateStr, string>,
): Occurrence[] {
  const out: Occurrence[] = [];
  for (const r of rules) {
    const start = r.startDate > from ? r.startDate : from;
    const end = r.endDate && r.endDate < to ? r.endDate : to;
    if (start > end || r.weekdays.length === 0) continue;
    const skips = new Set(r.skips);
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (isWeekend(d) || !r.weekdays.includes(weekday(d))) continue;
      if (skips.has(d) || closedReasonFor(d, closedDays)) continue;
      out.push({
        recurringId: r.id,
        date: d,
        time: r.time,
        bookerName: r.bookerName,
        patientName: r.patientName,
        phone: r.phone,
        note: r.note,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.time - b.time);
}

/** Следващото посещение от поредицата от дадена дата нататък (до 1 година напред). */
export function nextOccurrence(r: Recurring, from: DateStr, closedDays: Map<DateStr, string>): DateStr | null {
  const occ = expandRecurring([r], from, addDays(from, 366), closedDays);
  return occ[0]?.date ?? null;
}

/** Активна ли е поредицата към дадена дата. */
export const isActive = (r: Recurring, today: DateStr) => !r.endDate || r.endDate >= today;

/** Заети места по слот: еднократни записвания + повтарящи се посещения. */
export async function combinedSlotCounts(
  store: Store,
  from: DateStr,
  to: DateStr,
  closedDays: Map<DateStr, string>,
): Promise<Map<string, number>> {
  const [counts, rules] = await Promise.all([store.slotCounts(from, to), store.listRecurring()]);
  for (const o of expandRecurring(rules, from, to, closedDays)) {
    const k = slotKey(o.date, o.time);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

const DAY_NAMES = ["", "понеделник", "вторник", "сряда", "четвъртък", "петък"];
const DAY_PLURAL = ["", "всеки понеделник", "всеки вторник", "всяка сряда", "всеки четвъртък", "всеки петък"];

/** „всеки вторник“ / „всяка седмица във вторник и четвъртък“ / „всеки работен ден“ */
export function describeWeekdays(days: number[]): string {
  const d = [...new Set(days)].filter((n) => n >= 1 && n <= 5).sort();
  if (d.length === 5) return "всеки работен ден";
  if (d.length === 1) return DAY_PLURAL[d[0]];
  const names = d.map((n) => DAY_NAMES[n]);
  const prep = /^[вф]/.test(names[0]) ? "във" : "в";
  return `всяка седмица ${prep} ${names.slice(0, -1).join(", ")} и ${names[names.length - 1]}`;
}

