import "server-only";
import { neon } from "@neondatabase/serverless";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { DateStr } from "./slots";

export type Booking = {
  id: number;
  date: DateStr;
  hour: number;
  bookerName: string;
  /** Името на детето/човека, ако не е самият записващ. */
  patientName: string | null;
  phone: string;
  note: string | null;
  createdAt: string;
};

export type NewBooking = Omit<Booking, "id" | "createdAt">;
export type InsertResult = "ok" | "full" | "duplicate";

export interface Store {
  /** Брой записани по слот, ключ „YYYY-MM-DD|15“. */
  slotCounts(from: DateStr, to: DateStr): Promise<Map<string, number>>;
  insertBooking(b: NewBooking, capacity: number): Promise<InsertResult>;
  listBookings(from: DateStr): Promise<Booking[]>;
  listBetween(from: DateStr, to: DateStr): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | null>;
  /** Админ: добавя запис без проверка за капацитет. */
  adminInsert(b: NewBooking): Promise<number>;
  updateBooking(id: number, b: NewBooking): Promise<void>;
  deleteBooking(id: number): Promise<void>;
  closedDays(from: DateStr): Promise<Map<DateStr, string>>;
  addClosedDay(date: DateStr, reason: string): Promise<void>;
  removeClosedDay(date: DateStr): Promise<void>;
  /** Изтрива записванията преди дадена дата (срок за съхранение на данни). */
  purgeBefore(date: DateStr): Promise<void>;
}

export const slotKey = (date: DateStr, hour: number) => `${date}|${hour}`;

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
        hour SMALLINT NOT NULL,
        booker_name TEXT NOT NULL,
        patient_name TEXT,
        phone TEXT NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS bookings_date_hour ON bookings (date, hour)`;
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
    hour: Number(r.hour),
    bookerName: String(r.booker_name),
    patientName: (r.patient_name as string | null) ?? null,
    phone: String(r.phone),
    note: (r.note as string | null) ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
  });

  return {
    async slotCounts(from, to) {
      await ensureSchema();
      const rows = (await sql`SELECT date::text AS date, hour, count(*)::int AS n
        FROM bookings WHERE date BETWEEN ${from} AND ${to} GROUP BY date, hour`) as Row[];
      return new Map(rows.map((r) => [slotKey(String(r.date), Number(r.hour)), Number(r.n)]));
    },
    async insertBooking(b, capacity) {
      await ensureSchema();
      const dup = (await sql`SELECT 1 FROM bookings
        WHERE date = ${b.date} AND hour = ${b.hour} AND phone = ${b.phone}
          AND coalesce(patient_name, booker_name) = ${b.patientName ?? b.bookerName}
        LIMIT 1`) as Row[];
      if (dup.length) return "duplicate";
      // Вмъква само ако все още има място — проверката и записът са в една заявка.
      const inserted = (await sql`INSERT INTO bookings (date, hour, booker_name, patient_name, phone, note)
        SELECT ${b.date}::date, ${b.hour}::smallint, ${b.bookerName}::text, ${b.patientName}::text,
               ${b.phone}::text, ${b.note}::text
        WHERE (SELECT count(*) FROM bookings WHERE date = ${b.date}::date AND hour = ${b.hour}::smallint) < ${capacity}::int
        RETURNING id`) as Row[];
      return inserted.length ? "ok" : "full";
    },
    async listBookings(from) {
      await ensureSchema();
      const rows = (await sql`SELECT id, date::text AS date, hour, booker_name, patient_name, phone, note, created_at
        FROM bookings WHERE date >= ${from} ORDER BY date, hour, created_at`) as Row[];
      return rows.map(toBooking);
    },
    async listBetween(from, to) {
      await ensureSchema();
      const rows = (await sql`SELECT id, date::text AS date, hour, booker_name, patient_name, phone, note, created_at
        FROM bookings WHERE date BETWEEN ${from}::date AND ${to}::date ORDER BY date, hour, created_at`) as Row[];
      return rows.map(toBooking);
    },
    async getBooking(id) {
      await ensureSchema();
      const rows = (await sql`SELECT id, date::text AS date, hour, booker_name, patient_name, phone, note, created_at
        FROM bookings WHERE id = ${id}`) as Row[];
      return rows.length ? toBooking(rows[0]) : null;
    },
    async adminInsert(b) {
      await ensureSchema();
      const rows = (await sql`INSERT INTO bookings (date, hour, booker_name, patient_name, phone, note)
        VALUES (${b.date}::date, ${b.hour}::smallint, ${b.bookerName}, ${b.patientName}, ${b.phone}, ${b.note})
        RETURNING id`) as Row[];
      return Number(rows[0].id);
    },
    async updateBooking(id, b) {
      await ensureSchema();
      await sql`UPDATE bookings SET date = ${b.date}::date, hour = ${b.hour}::smallint,
        booker_name = ${b.bookerName}, patient_name = ${b.patientName}, phone = ${b.phone}, note = ${b.note}
        WHERE id = ${id}`;
    },
    async deleteBooking(id) {
      await ensureSchema();
      await sql`DELETE FROM bookings WHERE id = ${id}`;
    },
    async closedDays(from) {
      await ensureSchema();
      const rows = (await sql`SELECT date::text AS date, reason FROM closed_days
        WHERE date >= ${from} ORDER BY date`) as Row[];
      return new Map(rows.map((r) => [String(r.date), String(r.reason || "почивен ден")]));
    },
    async addClosedDay(date, reason) {
      await ensureSchema();
      await sql`INSERT INTO closed_days (date, reason) VALUES (${date}, ${reason})
        ON CONFLICT (date) DO UPDATE SET reason = EXCLUDED.reason`;
    },
    async removeClosedDay(date) {
      await ensureSchema();
      await sql`DELETE FROM closed_days WHERE date = ${date}`;
    },
    async purgeBefore(date) {
      await ensureSchema();
      await sql`DELETE FROM bookings WHERE date < ${date}`;
      await sql`DELETE FROM closed_days WHERE date < ${date}`;
    },
  };
}

/* ------------------------------------------------------------------ */
/* JSON файл — само за локална разработка без база                     */
/* ------------------------------------------------------------------ */

type FileData = { nextId: number; bookings: Booking[]; closed: Record<DateStr, string> };

function fileStore(): Store {
  const file = path.join(process.cwd(), ".data", "db.json");
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<FileData> {
    try {
      const d = JSON.parse(await fs.readFile(file, "utf8")) as Partial<FileData>;
      return { nextId: d.nextId ?? 1, bookings: d.bookings ?? [], closed: d.closed ?? {} };
    } catch {
      return { nextId: 1, bookings: [], closed: {} };
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

  return {
    async slotCounts(from, to) {
      const d = await read();
      const m = new Map<string, number>();
      for (const b of d.bookings) {
        if (b.date < from || b.date > to) continue;
        const k = slotKey(b.date, b.hour);
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    },
    insertBooking(b, capacity) {
      return mutate((d) => {
        const same = d.bookings.filter((x) => x.date === b.date && x.hour === b.hour);
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
      return d.bookings
        .filter((b) => b.date >= from)
        .sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour || a.createdAt.localeCompare(b.createdAt));
    },
    async listBetween(from, to) {
      const d = await read();
      return d.bookings
        .filter((b) => b.date >= from && b.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour || a.createdAt.localeCompare(b.createdAt));
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
