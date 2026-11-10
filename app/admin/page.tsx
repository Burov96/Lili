import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton, LoginForm, Submit } from "@/components/AdminControls";
import { AdminSheet, EditBookingForm, type EditValues } from "@/components/AdminEdit";
import { adminConfigured, isAdmin } from "@/lib/auth";
import { booking, site, slotHours } from "@/lib/config";
import {
  formatDateTime,
  formatDayNumber,
  formatHour,
  formatLongDate,
  formatMonthShort,
  formatMonthYear,
  formatSlot,
  formatWeekdayShort,
} from "@/lib/format";
import { formatBgPhone } from "@/lib/phone";
import { addDays, holidayName, isDateStr, nowInSofia, startOfWeek } from "@/lib/slots";
import { getStore, slotKey, type Booking } from "@/lib/store";
import { addClosedDayAction, deleteBookingAction, logout, removeClosedDayAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Администрация",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminPage({ searchParams }: Props) {
  if (!adminConfigured()) {
    return (
      <div className="container page-head prose">
        <h1>Администрация</h1>
        <p>
          Админ панелът не е настроен. Добавете <code translate="no">ADMIN_PASSWORD</code> и{" "}
          <code translate="no">SESSION_SECRET</code> в променливите на средата (локално в{" "}
          <code translate="no">.env.local</code>, във Vercel — Settings → Environment Variables) и рестартирайте.
        </p>
      </div>
    );
  }

  if (!(await isAdmin())) {
    return (
      <div className="container page-head">
        <h1>Вход за {site.therapist}</h1>
        <LoginForm />
      </div>
    );
  }

  const sp = await searchParams;
  const store = getStore();
  const now = nowInSofia();
  // Автоматично изтриване на стари данни (виж политиката за поверителност).
  await store.purgeBefore(addDays(now.date, -booking.retentionDays));

  const weekParam = one(sp.week);
  const monday = startOfWeek(isDateStr(weekParam) ? weekParam : now.date);
  const days = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
  const friday = days[4];
  const weekHref = (w: string, extra = "") => `/admin?week=${w}${extra}`;
  const closeHref = weekHref(monday);

  const [bookings, closedAll] = await Promise.all([
    store.listBetween(monday, friday),
    store.closedDays(monday),
  ]);

  const bySlot = new Map<string, Booking[]>();
  for (const b of bookings) {
    const k = slotKey(b.date, b.hour);
    bySlot.set(k, [...(bySlot.get(k) ?? []), b]);
  }
  const closedReason = (d: string) => closedAll.get(d) ?? holidayName(d);
  const savedId = Number(one(sp.saved)) || null;
  const deleted = one(sp.deleted) === "1";

  // Панел за редакция / нов запис
  let sheet: { title: string; values: EditValues; booking?: Booking } | null = null;
  const editId = Number(one(sp.edit));
  if (editId) {
    const b = await store.getBooking(editId);
    if (b) {
      sheet = {
        title: `Консултация: ${b.patientName ?? b.bookerName}`,
        values: { ...b, id: b.id },
        booking: b,
      };
    }
  } else {
    const nw = one(sp.new);
    const [nd, nh] = (nw ?? "").split("_");
    if (nw !== undefined) {
      sheet = {
        title: "Нов запис",
        values: {
          id: null,
          date: isDateStr(nd) ? nd : now.date,
          hour: slotHours.includes(Number(nh)) ? Number(nh) : slotHours[0],
          bookerName: "",
          patientName: null,
          phone: "",
          note: null,
        },
      };
    }
  }

  const hourOptions: [number, string][] = slotHours.map((h) => [h, formatSlot(h)]);

  const rangeLabel =
    formatMonthShort(monday) === formatMonthShort(friday)
      ? `${formatDayNumber(monday)} – ${formatDayNumber(friday)} ${formatMonthYear(friday)}`
      : `${formatDayNumber(monday)} ${formatMonthShort(monday)} – ${formatDayNumber(friday)} ${formatMonthYear(friday)}`;

  return (
    <div className="container admin" style={{ paddingBottom: "3rem" }}>
      <div className="admin-bar">
        <h1 style={{ margin: 0, fontSize: "var(--step-3)" }}>Записани часове</h1>
        <form action={logout}>
          <Submit className="btn btn--ghost btn--small" pendingLabel="Излизане…">
            Изход
          </Submit>
        </form>
      </div>

      <div className="wk-nav">
        <Link href={weekHref(addDays(monday, -7))} className="btn btn--ghost btn--small" aria-label="Предишна седмица">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <p className="wk-nav__range tabular">
          {rangeLabel}
          <span className="muted"> · {bookings.length} записа</span>
        </p>
        <Link href={weekHref(addDays(monday, 7))} className="btn btn--ghost btn--small" aria-label="Следваща седмица">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        {monday !== startOfWeek(now.date) ? (
          <Link href="/admin" className="btn btn--small">
            Тази седмица
          </Link>
        ) : null}
        <Link href={weekHref(monday, `&new=${now.date >= monday && now.date <= friday ? now.date : monday}_${slotHours[0]}`)} className="btn btn--small wk-nav__new" scroll={false}>
          + Нов запис
        </Link>
      </div>

      <div aria-live="polite">
        {savedId ? <p className="alert alert--ok reveal">Записът е запазен.</p> : null}
        {deleted ? <p className="alert alert--ok reveal">Записът е изтрит.</p> : null}
      </div>

      <div className="wk" style={{ ["--rows" as string]: slotHours.length }}>
        <div className="wk-times" aria-hidden="true">
          <div className="wk-head" />
          {slotHours.map((h) => (
            <div key={h} className="wk-time tabular">
              {formatHour(h)}
            </div>
          ))}
        </div>

        {days.map((d) => {
          const reason = closedReason(d);
          const isToday = d === now.date;
          const isPast = d < now.date;
          const dayCount = slotHours.reduce((n, h) => n + (bySlot.get(slotKey(d, h))?.length ?? 0), 0);
          const cls = ["wk-day", isToday && "is-today", isPast && "is-past", reason && "is-closed"].filter(Boolean).join(" ");
          return (
            <section key={d} className={cls} aria-labelledby={`wk-${d}`}>
              <h2 id={`wk-${d}`} className="wk-head">
                <span className="wk-head__dow">{formatWeekdayShort(d)}</span>
                <span className="wk-head__date tabular">
                  {formatDayNumber(d)} {formatMonthShort(d)}
                </span>
                <span className="wk-head__meta">
                  {isToday ? "днес · " : ""}
                  {reason ? reason : `${dayCount} ${dayCount === 1 ? "запис" : "записа"}`}
                </span>
              </h2>
              {slotHours.map((h) => {
                const list = bySlot.get(slotKey(d, h)) ?? [];
                const fill = list.length === 0 ? "" : list.length >= booking.capacityPerSlot ? "is-full" : "is-partial";
                const over = list.length > booking.capacityPerSlot;
                const past = d < now.date || (d === now.date && h * 60 + 60 <= now.minutes);
                return (
                  <div key={h} className={["wk-cell", fill, past && "is-past"].filter(Boolean).join(" ")}>
                    <div className="wk-cell__top">
                      <span className="wk-cell__time tabular">{formatSlot(h)}</span>
                      <span className={over ? "wk-count is-over" : "wk-count"} title="записани / места">
                        {list.length}/{booking.capacityPerSlot}
                      </span>
                      <Link
                        href={weekHref(monday, `&new=${d}_${h}`)}
                        scroll={false}
                        className="wk-add"
                        aria-label={`Добави запис: ${formatLongDate(d)}, ${formatSlot(h)}`}
                      >
                        +
                      </Link>
                    </div>
                    {list.length ? (
                      <ul className="wk-list">
                        {list.map((b) => (
                          <li key={b.id}>
                            <Link
                              href={weekHref(monday, `&edit=${b.id}`)}
                              scroll={false}
                              className={b.id === savedId ? "chip is-saved" : "chip"}
                              aria-label={`Редактирай: ${b.patientName ?? b.bookerName}, ${formatSlot(h)}`}
                            >
                              <span className="chip__name">{b.patientName ?? b.bookerName}</span>
                              <span className="chip__meta tabular">
                                {formatBgPhone(b.phone)}
                                {b.note ? " · ✎" : ""}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>

      <ul className="wk-legend" aria-label="Легенда">
        <li>
          <span className="wk-swatch is-partial" aria-hidden="true" /> има записани
        </li>
        <li>
          <span className="wk-swatch is-full" aria-hidden="true" /> пълен час
        </li>
        <li>
          <span className="wk-swatch is-closed" aria-hidden="true" /> почивен ден
        </li>
      </ul>

      {sheet ? (
        <AdminSheet key={`${editId}-${one(sp.new)}`} title={sheet.title} closeHref={closeHref}>
          {sheet.booking ? (
            <p className="muted" style={{ fontSize: "var(--step--1)", marginTop: "-0.5rem" }}>
              {formatLongDate(sheet.booking.date)}, {formatSlot(sheet.booking.hour)}
              {sheet.booking.patientName ? ` · записан от ${sheet.booking.bookerName}` : ""}
              <br />
              Записан на {formatDateTime(sheet.booking.createdAt)}
            </p>
          ) : null}
          <EditBookingForm values={sheet.values} hours={hourOptions} closeHref={closeHref} />
          {sheet.booking ? (
            <div className="sheet__danger">
              <p className="muted" style={{ margin: 0 }}>
                Изтриването освобождава мястото в календара.
              </p>
              <ConfirmButton
                action={deleteBookingAction}
                fields={{ id: sheet.booking.id, week: monday }}
                label="Изтрий консултацията"
                confirmLabel="Да, изтрий"
                ariaLabel={`Изтрий консултацията на ${sheet.booking.patientName ?? sheet.booking.bookerName}`}
              />
            </div>
          ) : null}
        </AdminSheet>
      ) : null}

      <section className="section" aria-labelledby="closed-title" style={{ paddingBottom: 0 }}>
        <h2 id="closed-title" style={{ fontSize: "var(--step-2)" }}>
          Почивни дни
        </h2>
        <p className="muted prose">
          Затворените дни не могат да се записват онлайн. Официалните празници се затварят автоматично; добавете
          тук отпуск и пренесените почивни дни.
        </p>
        <form action={addClosedDayAction} className="admin-form-row" style={{ marginBottom: "1.5rem" }}>
          <div className="field">
            <label htmlFor="closed-date">Дата</label>
            <input id="closed-date" name="date" type="date" className="input" min={now.date} required autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="closed-reason">Причина</label>
            <input
              id="closed-reason"
              name="reason"
              className="input"
              maxLength={80}
              placeholder="напр. отпуск…"
              autoComplete="off"
            />
          </div>
          <Submit pendingLabel="Добавяне…">Затвори деня</Submit>
        </form>
        {[...closedAll.entries()].filter(([d]) => d >= now.date).length === 0 ? (
          <p className="empty">Няма добавени почивни дни.</p>
        ) : (
          <ul className="admin-list">
            {[...closedAll.entries()]
              .filter(([d]) => d >= now.date)
              .map(([date, reason]) => (
                <li key={date} className="admin-item">
                  <div className="admin-item__who">
                    <strong>{formatLongDate(date)}</strong>
                    <span className="muted">{reason}</span>
                  </div>
                  <ConfirmButton
                    action={removeClosedDayAction}
                    fields={{ date }}
                    label="Отвори деня"
                    confirmLabel="Потвърди"
                    ariaLabel={`Отвори отново ${formatLongDate(date)}`}
                  />
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
