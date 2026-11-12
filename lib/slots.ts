import { booking, slotTimes } from "./config";

/** Дата във формат YYYY-MM-DD (без часова зона). */
export type DateStr = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateStr(v: unknown): v is DateStr {
  if (typeof v !== "string" || !DATE_RE.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function toUTC(date: DateStr): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(dt: Date): DateStr {
  return dt.toISOString().slice(0, 10);
}

export function addDays(date: DateStr, days: number): DateStr {
  const dt = toUTC(date);
  dt.setUTCDate(dt.getUTCDate() + days);
  return fromUTC(dt);
}

/** 0 = неделя … 6 = събота */
export function weekday(date: DateStr): number {
  return toUTC(date).getUTCDay();
}

export function isWeekend(date: DateStr): boolean {
  const w = weekday(date);
  return w === 0 || w === 6;
}

/** Текуща дата и минути от полунощ в часовата зона на кабинета (София). */
export function nowInSofia(now: Date = new Date()): { date: DateStr; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: booking.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Православен Великден (григориански календар), валидно за 1900–2099. */
export function orthodoxEaster(year: number): DateStr {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  // Юлианска дата → григорианска (+13 дни за 1900–2099)
  return addDays(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, 13);
}

/**
 * Официални празници в България. Пренесените почивни дни (когато празник
 * се падне в събота/неделя) се затварят ръчно от админ панела.
 */
export function bulgarianHolidays(year: number): Map<DateStr, string> {
  const y = String(year);
  const easter = orthodoxEaster(year);
  return new Map<DateStr, string>([
    [`${y}-01-01`, "Нова година"],
    [`${y}-03-03`, "Национален празник"],
    [addDays(easter, -2), "Велики петък"],
    [addDays(easter, -1), "Велика събота"],
    [easter, "Великден"],
    [addDays(easter, 1), "Великден"],
    [`${y}-05-01`, "Ден на труда"],
    [`${y}-05-06`, "Гергьовден"],
    [`${y}-05-24`, "Ден на светите братя Кирил и Методий"],
    [`${y}-09-06`, "Ден на Съединението"],
    [`${y}-09-22`, "Ден на Независимостта"],
    [`${y}-12-24`, "Бъдни вечер"],
    [`${y}-12-25`, "Коледа"],
    [`${y}-12-26`, "Коледа"],
  ]);
}

export function holidayName(date: DateStr): string | undefined {
  return bulgarianHolidays(Number(date.slice(0, 4))).get(date);
}

export type DayInfo = {
  date: DateStr;
  /** Затворено: уикенд, празник или ръчно затворен ден. */
  closed: boolean;
  closedReason?: string;
  /** Денят вече е минал (или е днес и няма оставащи часове). */
  past: boolean;
};

/** Първият ден (понеделник) от седмицата на дадена дата. */
export function startOfWeek(date: DateStr): DateStr {
  const w = weekday(date);
  return addDays(date, w === 0 ? -6 : 1 - w);
}

/** Последната дата, до която може да се записва. */
export function lastBookableDate(today: DateStr): DateStr {
  return addDays(today, booking.weeksAhead * 7);
}

/** Може ли все още да се запише часът (не е минал и има достатъчно време до него). `time` е в минути. */
export function slotNotTooLate(date: DateStr, time: number, now = nowInSofia()): boolean {
  if (date < now.date) return false;
  if (date > now.date) return true;
  return time - now.minutes >= booking.minLeadMinutes;
}

/** Денят затворен ли е (празник или ръчно затворен). */
export function closedReasonFor(date: DateStr, closedDays: Map<DateStr, string>): string | undefined {
  return closedDays.get(date) ?? holidayName(date);
}

/**
 * Работните дни (пон–пет), показвани в календара: от понеделника на текущата
 * седмица до края на периода за записване.
 */
export function calendarDays(
  closedDays: Map<DateStr, string>,
  now = nowInSofia(),
): DayInfo[] {
  const from = startOfWeek(now.date);
  const to = lastBookableDate(now.date);
  const days: DayInfo[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (isWeekend(d)) continue;
    const reason = closedDays.get(d) ?? holidayName(d);
    const past = !slotTimes.some((t) => slotNotTooLate(d, t, now));
    days.push({ date: d, closed: Boolean(reason), closedReason: reason, past });
  }
  return days;
}

/** Пълна проверка дали час може да бъде записан (без капацитета). */
export function validateSlot(
  date: unknown,
  time: unknown,
  closedDays: Map<DateStr, string>,
  now = nowInSofia(),
): { ok: true; date: DateStr; time: number } | { ok: false; error: string } {
  if (!isDateStr(date)) return { ok: false, error: "Изберете ден от календара." };
  const t = Number(time);
  if (!Number.isInteger(t) || !slotTimes.includes(t)) {
    return { ok: false, error: "Изберете час от списъка." };
  }
  if (isWeekend(date)) return { ok: false, error: "Кабинетът работи от понеделник до петък." };
  const reason = closedReasonFor(date, closedDays);
  if (reason) return { ok: false, error: `Този ден кабинетът е затворен (${reason}). Изберете друг ден.` };
  if (date > lastBookableDate(now.date)) {
    return { ok: false, error: `Може да записвате до ${booking.weeksAhead} седмици напред.` };
  }
  if (!slotNotTooLate(date, t, now)) {
    return { ok: false, error: "Този час вече не може да се запише. Изберете по-късен час или друг ден." };
  }
  return { ok: true, date, time: t };
}
