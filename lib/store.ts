import "server-only";
import { neon } from "@neondatabase/serverless";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { DateStr } from "./slots";

export type Booking = {
  id: number;
  date: DateStr;
  /** Начален час в минути от полунощ (930 = 15:30). */
  time: number;
  bookerName: string;
  /** Името на детето/човека, ако не е самият записващ. */
  patientName: string | null;
  phone: string;
  note: string | null;
  createdAt: string;
};

export type NewBooking = Omit<Booking, "id" | "createdAt">;
export type InsertResult = "ok" | "full" | "duplicate";

/** Повтарящо се посещение: всяка седмица в избраните работни дни, в един и същи час. */
export type Recurring = {
  id: number;
  /** 1 = понеделник … 5 = петък */
  weekdays: number[];
  time: number;
  bookerName: string;
  patientName: string | null;
  phone: string;
  note: string | null;
  startDate: DateStr;
  /** Последен ден с посещение; null = без край. */
  endDate: DateStr | null;
  /** Отделни дати, в които посещението е пропуснато или преместено. */
  skips: DateStr[];
  createdAt: string;
};

export type NewRecurring = Omit<Recurring, "id" | "createdAt" | "skips">;

export interface Store {
  /** Брой еднократни записвания по слот, ключ „YYYY-MM-DD|930“. */
  slotCounts(from: DateStr, to: DateStr): Promise<Map<string, number>>;
  insertBooking(b: NewBooking, capacity: number): Promise<InsertResult>;
  listBookings(from: DateStr): Promise<Booking[]>;
  listBetween(from: DateStr, to: DateStr): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | null>;
  /** Админ: добавя запис без проверка за капацитет. */
  adminInsert(b: NewBooking): Promise<number>;
  updateBooking(id: number, b: NewBooking): Promise<void>;
  deleteBooking(id: number): Promise<void>;

  listRecurring(): Promise<Recurring[]>;
  getRecurring(id: number): Promise<Recurring | null>;
  insertRecurring(r: NewRecurring): Promise<number>;
  updateRecurring(id: number, r: NewRecurring): Promise<void>;
  setRecurringEnd(id: number, endDate: DateStr | null): Promise<void>;
  addRecurringSkip(id: number, date: DateStr): Promise<void>;
  deleteRecurring(id: number): Promise<void>;

  closedDays(from: DateStr): Promise<Map<DateStr, string>>;
  addClosedDay(date: DateStr, reason: string): Promise<void>;
  removeClosedDay(date: DateStr): Promise<void>;
  /** Изтрива стари данни (срок за съхранение). */
  purgeBefore(date: DateStr): Promise<void>;
}

export const slotKey = (date: DateStr, time: number) => `${date}|${time}`;

const parseWeekdays = (s: string) =>
  s
    .split(",")
    .map(Number)
    .filter((n) => n >= 1 && n <= 5);
const parseSkips = (s: string) => s.split(",").filter(Boolean);

/* ------------------------------------------------------------------ */
/* Postgres (Neon) — използва се, когато има DATABASE_URL              */
/* ------------------------------------------------------------------ */

function postgresStore(url: string): Store {
  const sql = neon(url);
  let ready: Promise<unknown> | null = null;
  const ensureSchema = () =>
    (ready ??= (async () => {
      await sql`CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        hour SMALLINT,
        start_min SMALLINT,
        booker_name TEXT NOT NULL,
        patient_name TEXT,
        phone TEXT NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      // Миграция: от кръгли часове (колона hour) към минути (start_min).
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_min SMALLINT`;
      await sql`ALTER TABLE bookings ALTER COLUMN hour DROP NOT NULL`;
      await sql`UPDATE bookings SET start_min = hour * 60 WHERE start_min IS NULL AND hour IS NOT NULL`;
      await sql`CREATE INDEX IF NOT EXISTS bookings_date_start ON bookings (date, start_min)`;
      await sql`CREATE TABLE IF NOT EXISTS recurring (
        id SERIAL PRIMARY KEY,
        weekdays TEXT NOT NULL,
        start_min SMALLINT NOT NULL,
        booker_name TEXT NOT NULL,
        patient_name TEXT,
        phone TEXT NOT NULL,
        note TEXT,
        start_date DATE NOT NULL,
        end_date DATE,
        skips TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS closed_days (
        date DATE PRIMARY KEY,
        reason TEXT NOT NULL DEFAULT ''
      )`;
    })().catch((e) => {
      ready = null;
      throw e;
    }));

  type Row = Record<string, unknown>;
  const toBooking = (r: Row): Booking => ({
    id: Number(r.id),
    date: String(r.date),
    time: Number(r.start_min),
    bookerName: String(r.booker_name),
    patientName: (r.patient_name as string | null) ?? null,
    phone: String(r.phone),
    note: (r.note as string | null) ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
  });
  const toRecurring = (r: Row): Recurring => ({
    id: Number(r.id),
    weekdays: parseWeekdays(String(r.weekdays)),
    time: Number(r.start_min),
    bookerName: String(r.booker_name),
    patientName: (r.patient_name as string | null) ?? null,
    phone: String(r.phone),
    note: (r.note as string | null) ?? null,
    startDate: String(r.start_date),
    endDate: r.end_date ? String(r.end_date) : null,
    skips: parseSkips(String(r.skips ?? "")),
    createdAt: new Date(r.created_at as string).toISOString(),
  });

  return {
    async slotCounts(from, to) {
      await ensureSchema();
      const rows = (await sql`SELECT date::text AS date, start_min, count(*)::int AS n
        FROM bookings WHERE date BETWEEN ${from}::date AND ${to}::date GROUP BY date, start_min`) as Row[];
      return new Map(rows.map((r) => [slotKey(String(r.date), Number(r.start_min)), Number(r.n)]));
    },
    async insertBooking(b, capacity) {
      await ensureSchema();
      const dup = (await sql`SELECT 1 FROM bookings
        WHERE date = ${b.date}::date AND start_min = ${b.time}::smallint AND phone = ${b.phone}
          AND coalesce(patient_name, booker_name) = ${b.patientName ?? b.bookerName}
        LIMIT 1`) as Row[];
      if (dup.length) return "duplicate";
      // Вмъква само ако все още има място — проверката и записът са в една заявка.
      const inserted = (await sql`INSERT INTO bookings (date, start_min, booker_name, patient_name, phone, note)
        SELECT ${b.date}::date, ${b.time}::smallint, ${b.bookerName}::text, ${b.patientName}::text,
               ${b.phone}::text, ${b.note}::text
        WHERE (SELECT count(*) FROM bookings WHERE date = ${b.date}::date AND start_min = ${b.time}::smallint) < ${capacity}::int
        RETURNING id`) as Row[];
      return inserted.length ? "ok" : "full";
    },
    async listBookings(from) {
      await ensureSchema();
      const rows = (await sql`SELECT id, date::text AS date, start_min, booker_name, patient_name, phone, note, created_at
        FROM bookings WHERE date >= ${from}::date ORDER BY date, start_min, created_at`) as Row[];
      return rows.map(toBooking);
    },
    async listBetween(from, to) {
      await ensureSchema();
      const rows = (await sql`SELECT id, date::text AS date, start_min, booker_name, patient_name, phone, note, created_at
        FROM bookings WHERE date BETWEEN ${from}::date AND ${to}::date ORDER BY date, start_min, created_at`) as Row[];
      return rows.map(toBooking);
    },
    async getBooking(id) {
      await ensureSchema();
      const rows = (await sql`SELECT id, date::text AS date, start_min, booker_name, patient_name, phone, note, created_at
        FROM bookings WHERE id = ${id}`) as Row[];
      return rows.length ? toBooking(rows[0]) : null;
    },
    async adminInsert(b) {
      await ensureSchema();
      const rows = (await sql`INSERT INTO bookings (date, start_min, booker_name, patient_name, phone, note)
        VALUES (${b.date}::date, ${b.time}::smallint, ${b.bookerName}, ${b.patientName}, ${b.phone}, ${b.note})
        RETURNING id`) as Row[];
      return Number(rows[0].id);
    },
    async updateBooking(id, b) {
      await ensureSchema();
      await sql`UPDATE bookings SET date = ${b.date}::date, start_min = ${b.time}::smallint,
        booker_name = ${b.bookerName}, patient_name = ${b.patientName}, phone = ${b.phone}, note = ${b.note}
        WHERE id = ${id}`;
    },
    async deleteBooking(id) {
      await ensureSchema();
      await sql`DELETE FROM bookings WHERE id = ${id}`;
    },

    async listRecurring() {
      await ensureSchema();
      const rows = (await sql`SELECT id, weekdays, start_min, booker_name, patient_name, phone, note,
        start_date::text AS start_date, end_date::text AS end_date, skips, created_at
        FROM recurring ORDER BY start_min, id`) as Row[];
      return rows.map(toRecurring);
    },
    async getRecurring(id) {
      await ensureSchema();
      const rows = (await sql`SELECT id, weekdays, start_min, booker_name, patient_name, phone, note,
        start_date::text AS start_date, end_date::text AS end_date, skips, created_at
        FROM recurring WHERE id = ${id}`) as Row[];
      return rows.length ? toRecurring(rows[0]) : null;
    },
    async insertRecurring(r) {
      await ensureSchema();
      const rows = (await sql`INSERT INTO recurring (weekdays, start_min, booker_name, patient_name, phone, note, start_date, end_date)
        VALUES (${r.weekdays.join(",")}, ${r.time}::smallint, ${r.bookerName}, ${r.patientName}, ${r.phone}, ${r.note},
                ${r.startDate}::date, ${r.endDate}::date)
        RETURNING id`) as Row[];
      return Number(rows[0].id);
    },
    async updateRecurring(id, r) {
      await ensureSchema();
      await sql`UPDATE recurring SET weekdays = ${r.weekdays.join(",")}, start_min = ${r.time}::smallint,
        booker_name = ${r.bookerName}, patient_name = ${r.patientName}, phone = ${r.phone}, note = ${r.note},
        start_date = ${r.startDate}::date, end_date = ${r.endDate}::date
        WHERE id = ${id}`;
    },
    async setRecurringEnd(id, endDate) {
      await ensureSchema();
      await sql`UPDATE recurring SET end_date = ${endDate}::date WHERE id = ${id}`;
    },
    async addRecurringSkip(id, date) {
      await ensureSchema();
      await sql`UPDATE recurring
        SET skips = CASE WHEN skips = '' THEN ${date} ELSE skips || ',' || ${date} END
        WHERE id = ${id} AND position(${date} in skips) = 0`;
    },
    async deleteRecurring(id) {
      await ensureSchema();
      await sql`DELETE FROM recurring WHERE id = ${id}`;
    },

    async closedDays(from) {
      await ensureSchema();
      const rows = (await sql`SELECT date::text AS date, reason FROM closed_days
        WHERE date >= ${from}::date ORDER BY date`) as Row[];
      return new Map(rows.map((r) => [String(r.date), String(r.reason || "почивен ден")]));
    },
    async addClosedDay(date, reason) {
      await ensureSchema();
      await sql`INSERT INTO closed_days (date, reason) VALUES (${date}::date, ${reason})
        ON CONFLICT (date) DO UPDATE SET reason = EXCLUDED.reason`;
    },
    async removeClosedDay(date) {
      await ensureSchema();
      await sql`DELETE FROM closed_days WHERE date = ${date}::date`;
    },
    async purgeBefore(date) {
      await ensureSchema();
      await sql`DELETE FROM bookings WHERE date < ${date}::date`;
      await sql`DELETE FROM closed_days WHERE date < ${date}::date`;
      await sql`DELETE FROM recurring WHERE end_date IS NOT NULL AND end_date < ${date}::date`;
    },
  };
}

/* ------------------------------------------------------------------ */
/* JSON файл — само за локална разработка без база                     */
/* ------------------------------------------------------------------ */

type FileBooking = Booking & { hour?: number };
type FileData = {
  nextId: number;
  bookings: FileBooking[];
  recurring: Recurring[];
  closed: Record<DateStr, string>;
};

function fileStore(): Store {
  const file = path.join(process.cwd(), ".data", "db.json");
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<FileData> {
    try {
      const d = JSON.parse(await fs.readFile(file, "utf8")) as Partial<FileData>;
      // Миграция на стари записи с кръгли часове
      const bookings = (d.bookings ?? []).map((b) =>
        b.time === undefined && b.hour !== undefined ? { ...b, time: b.hour * 60 } : b,
      );
      return { nextId: d.nextId ?? 1, bookings, recurring: d.recurring ?? [], closed: d.closed ?? {} };
    } catch {
      return { nextId: 1, bookings: [], recurring: [], closed: {} };
    }
  }
  async function write(data: FileData) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2));
  }
  /** Сериализира промените, за да не се презаписват едновременно. */
  function mutate<T>(fn: (d: FileData) => T): Promise<T> {
    const run = queue.then(async () => {
      const d = await read();
      const result = fn(d);
      await write(d);
      return result;
    });
    queue = run.catch(() => undefined);
    return run;
  }
  const sortB = (a: Booking, b: Booking) =>
    a.date.localeCompare(b.date) || a.time - b.time || a.createdAt.localeCompare(b.createdAt);

  return {
    async slotCounts(from, to) {
      const d = await read();
      const m = new Map<string, number>();
      for (const b of d.bookings) {
        if (b.date < from || b.date > to) continue;
        const k = slotKey(b.date, b.time);
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    },
    insertBooking(b, capacity) {
      return mutate((d) => {
        const same = d.bookings.filter((x) => x.date === b.date && x.time === b.time);
        const who = b.patientName ?? b.bookerName;
        if (same.some((x) => x.phone === b.phone && (x.patientName ?? x.bookerName) === who)) {
          return "duplicate" as const;
        }
        if (same.length >= capacity) return "full" as const;
        d.bookings.push({ ...b, id: d.nextId++, createdAt: new Date().toISOString() });
        return "ok" as const;
      });
    },
    async listBookings(from) {
      const d = await read();
      return d.bookings.filter((b) => b.date >= from).sort(sortB);
    },
    async listBetween(from, to) {
      const d = await read();
      return d.bookings.filter((b) => b.date >= from && b.date <= to).sort(sortB);
    },
    async getBooking(id) {
      const d = await read();
      return d.bookings.find((b) => b.id === id) ?? null;
    },
    adminInsert(b) {
      return mutate((d) => {
        const id = d.nextId++;
        d.bookings.push({ ...b, id, createdAt: new Date().toISOString() });
        return id;
      });
    },
    async updateBooking(id, b) {
      await mutate((d) => {
        d.bookings = d.bookings.map((x) => (x.id === id ? { ...x, ...b } : x));
      });
    },
    async deleteBooking(id) {
      await mutate((d) => {
        d.bookings = d.bookings.filter((b) => b.id !== id);
      });
    },

    async listRecurring() {
      const d = await read();
      return [...d.recurring].sort((a, b) => a.time - b.time || a.id - b.id);
    },
    async getRecurring(id) {
      const d = await read();
      return d.recurring.find((r) => r.id === id) ?? null;
    },
    insertRecurring(r) {
      return mutate((d) => {
        const id = d.nextId++;
        d.recurring.push({ ...r, id, skips: [], createdAt: new Date().toISOString() });
        return id;
      });
    },
    async updateRecurring(id, r) {
      await mutate((d) => {
        d.recurring = d.recurring.map((x) => (x.id === id ? { ...x, ...r } : x));
      });
    },
    async setRecurringEnd(id, endDate) {
      await mutate((d) => {
        d.recurring = d.recurring.map((x) => (x.id === id ? { ...x, endDate } : x));
      });
    },
    async addRecurringSkip(id, date) {
      await mutate((d) => {
        d.recurring = d.recurring.map((x) =>
          x.id === id && !x.skips.includes(date) ? { ...x, skips: [...x.skips, date] } : x,
        );
      });
    },
    async deleteRecurring(id) {
      await mutate((d) => {
        d.recurring = d.recurring.filter((x) => x.id !== id);
      });
    },

    async closedDays(from) {
      const d = await read();
      return new Map(
        Object.entries(d.closed)
          .filter(([date]) => date >= from)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, reason]) => [date, reason || "почивен ден"]),
      );
    },
    async addClosedDay(date, reason) {
      await mutate((d) => {
        d.closed[date] = reason;
      });
    },
    async removeClosedDay(date) {
      await mutate((d) => {
        delete d.closed[date];
      });
    },
    async purgeBefore(date) {
      await mutate((d) => {
        d.bookings = d.bookings.filter((b) => b.date >= date);
        d.recurring = d.recurring.filter((r) => !r.endDate || r.endDate >= date);
        for (const k of Object.keys(d.closed)) if (k < date) delete d.closed[k];
      });
    },
  };
}

let store: Store | null = null;

export function getStore(): Store {
  if (store) return store;
  const url = process.env.DATABASE_URL;
  if (url) {
    store = postgresStore(url);
  } else if (process.env.NODE_ENV === "production" && !process.env.ALLOW_FILE_STORE) {
    throw new Error(
      "Липсва DATABASE_URL. Свържи Neon Postgres към проекта във Vercel (Storage → Neon) и redeploy-ни.",
    );
  } else {
    store = fileStore();
  }
  return store;
}
