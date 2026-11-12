import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton, LoginForm, Submit } from "@/components/AdminControls";
import { AdminSheet, EditBookingForm, MoveOccurrenceForm, type EditValues } from "@/components/AdminEdit";
import { adminConfigured, isAdmin } from "@/lib/auth";
import { booking, site, slotTimes } from "@/lib/config";
import {
  formatDateTime,
  formatDayNumber,
  formatLongDate,
  formatMonthShort,
  formatMonthYear,
  formatTime,
  formatWeekdayShort,
} from "@/lib/format";
import { formatBgPhone } from "@/lib/phone";
import { describeWeekdays, expandRecurring, isActive, nextOccurrence, type Occurrence } from "@/lib/recurring";
import { addDays, holidayName, isDateStr, nowInSofia, startOfWeek, weekday } from "@/lib/slots";
import { getStore, slotKey, type Booking, type Recurring } from "@/lib/store";
import {
  addClosedDayAction,
  deleteBookingAction,
  deleteRecurringAction,
  logout,
  removeClosedDayAction,
  resumeRecurringAction,
  skipOccurrenceAction,
  stopRecurringAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Администрация",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Елемент в клетка: еднократен запис или посещение от поредица. */
type Entry = { kind: "single"; b: Booking } | { kind: "rec"; o: Occurrence };

const RecurIcon = () => (
  <svg className="icon rec-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4v4.7h-4.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3M4 20v-4.7h4.7"
    />
  </svg>
);

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

  const [bookings, rules, closedAll] = await Promise.all([
    store.listBetween(monday, friday),
    store.listRecurring(),
    store.closedDays(addDays(monday, -400)),
  ]);
  const occurrences = expandRecurring(rules, monday, friday, closedAll);

  const bySlot = new Map<string, Entry[]>();
  const push = (date: string, time: number, e: Entry) => {
    const k = slotKey(date, time);
    bySlot.set(k, [...(bySlot.get(k) ?? []), e]);
  };
  for (const o of occurrences) push(o.date, o.time, { kind: "rec", o });
  for (const b of bookings) push(b.date, b.time, { kind: "single", b });

  const closedReason = (d: string) => closedAll.get(d) ?? holidayName(d);
  const savedId = Number(one(sp.saved)) || null;
  const savedRec = Number(one(sp.savedRec)) || null;
  const flash = one(sp.deleted)
    ? "Записът е изтрит."
    : one(sp.skipped)
      ? "Посещението е пропуснато."
      : one(sp.stopped)
        ? "Повторенията са спрени."
        : one(sp.resumed)
          ? "Повторенията са подновени."
          : savedRec
            ? "Повтарящото се посещение е запазено."
            : savedId
              ? "Записът е запазен."
              : null;

  const times: [number, string][] = slotTimes.map((t) => [t, formatTime(t)]);
  const weekTotal = bookings.length + occurrences.length;

  // ---------- Панел ----------
  type Sheet =
    | { mode: "single"; title: string; values: EditValues; b?: Booking }
    | { mode: "rule"; title: string; values: EditValues; r: Recurring; on: string | null };
  let sheet: Sheet | null = null;

  const editId = Number(one(sp.edit));
  const recId = Number(one(sp.rec));
  const nw = one(sp.new);
  if (editId) {
    const b = await store.getBooking(editId);
    if (b) {
      sheet = {
        mode: "single",
        title: `Консултация: ${b.patientName ?? b.bookerName}`,
        values: { ...b, id: b.id, recId: null, weekdays: [weekday(b.date)] },
        b,
      };
    }
  } else if (recId) {
    const r = rules.find((x) => x.id === recId) ?? null;
    if (r) {
      const on = one(sp.on);
      sheet = {
        mode: "rule",
        title: `Повтарящо се: ${r.patientName ?? r.bookerName}`,
        values: {
          id: null,
          recId: r.id,
          date: r.startDate,
          time: r.time,
          weekdays: r.weekdays,
          bookerName: r.bookerName,
          patientName: r.patientName,
          phone: r.phone,
          note: r.note,
        },
        r,
        on: isDateStr(on) ? on : null,
      };
    }
  } else if (nw !== undefined) {
    const [nd, nt] = nw.split("_");
    const date = isDateStr(nd) ? nd : now.date;
    sheet = {
      mode: "single",
      title: "Нов запис",
      values: {
        id: null,
        recId: null,
        date,
        time: slotTimes.includes(Number(nt)) ? Number(nt) : slotTimes[0],
        weekdays: [weekday(date) >= 1 && weekday(date) <= 5 ? weekday(date) : 1],
        bookerName: "",
        patientName: null,
        phone: "",
        note: null,
      },
    };
  }

  const rangeLabel =
    formatMonthShort(monday) === formatMonthShort(friday)
      ? `${formatDayNumber(monday)} – ${formatDayNumber(friday)} ${formatMonthYear(friday)}`
      : `${formatDayNumber(monday)} ${formatMonthShort(monday)} – ${formatDayNumber(friday)} ${formatMonthYear(friday)}`;

  const activeRules = rules.filter((r) => isActive(r, now.date));
  const stoppedRules = rules.filter((r) => !isActive(r, now.date));

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
          <span className="muted"> · {weekTotal} записа</span>
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
        <Link
          href={weekHref(monday, `&new=${now.date >= monday && now.date <= friday ? now.date : monday}_${slotTimes[0]}`)}
          className="btn btn--small wk-nav__new"
          scroll={false}
        >
          + Нов запис
        </Link>
      </div>

      <div aria-live="polite">{flash ? <p className="alert alert--ok reveal">{flash}</p> : null}</div>

      <div className="wk" style={{ ["--rows" as string]: slotTimes.length }}>
        <div className="wk-times" aria-hidden="true">
          <div className="wk-head" />
          {slotTimes.map((t) => (
            <div key={t} className="wk-time tabular">
              {formatTime(t)}
            </div>
          ))}
        </div>

        {days.map((d) => {
          const reason = closedReason(d);
          const isToday = d === now.date;
          const isPast = d < now.date;
          const dayCount = slotTimes.reduce((n, t) => n + (bySlot.get(slotKey(d, t))?.length ?? 0), 0);
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
              {slotTimes.map((t) => {
                const list = bySlot.get(slotKey(d, t)) ?? [];
                const fill = list.length === 0 ? "" : list.length >= booking.capacityPerSlot ? "is-full" : "is-partial";
                const over = list.length > booking.capacityPerSlot;
                const past = d < now.date || (d === now.date && t + booking.slotMinutes <= now.minutes);
                return (
                  <div key={t} className={["wk-cell", fill, past && "is-past"].filter(Boolean).join(" ")}>
                    <div className="wk-cell__top">
                      <span className="wk-cell__time tabular">{formatTime(t)}</span>
                      <span className={over ? "wk-count is-over" : "wk-count"} title="записани / места">
                        {list.length}/{booking.capacityPerSlot}
                      </span>
                      <Link
                        href={weekHref(monday, `&new=${d}_${t}`)}
                        scroll={false}
                        className="wk-add"
                        aria-label={`Добави запис: ${formatLongDate(d)}, ${formatTime(t)}`}
                      >
                        +
                      </Link>
                    </div>
                    {list.length ? (
                      <ul className="wk-list">
                        {list.map((e) =>
                          e.kind === "single" ? (
                            <li key={`b${e.b.id}`}>
                              <Link
                                href={weekHref(monday, `&edit=${e.b.id}`)}
                                scroll={false}
                                className={e.b.id === savedId ? "chip is-saved" : "chip"}
                                aria-label={`Редактирай: ${e.b.patientName ?? e.b.bookerName}, ${formatTime(t)}`}
                              >
                                <span className="chip__name">{e.b.patientName ?? e.b.bookerName}</span>
                                <span className="chip__meta tabular">
                                  {formatBgPhone(e.b.phone)}
                                  {e.b.note ? " · ✎" : ""}
                                </span>
                              </Link>
                            </li>
                          ) : (
                            <li key={`r${e.o.recurringId}`}>
                              <Link
                                href={weekHref(monday, `&rec=${e.o.recurringId}&on=${d}`)}
                                scroll={false}
                                className={e.o.recurringId === savedRec ? "chip chip--rec is-saved" : "chip chip--rec"}
                                aria-label={`Повтарящо се посещение: ${e.o.patientName ?? e.o.bookerName}, ${formatTime(t)}`}
                              >
                                <span className="chip__name">
                                  <RecurIcon />
                                  {e.o.patientName ?? e.o.bookerName}
                                </span>
                                <span className="chip__meta tabular">{formatBgPhone(e.o.phone)}</span>
                              </Link>
                            </li>
                          ),
                        )}
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
        <li>
          <RecurIcon /> повтарящо се посещение
        </li>
      </ul>

      {/* ---------- Постоянни посещения ---------- */}
      <section className="section" aria-labelledby="rec-title" style={{ paddingBottom: 0 }}>
        <h2 id="rec-title" style={{ fontSize: "var(--step-2)" }}>
          Постоянни посещения
        </h2>
        <p className="muted prose">
          Пациенти, които идват редовно в един и същи час. Добавят се от отметката „Повтаряй всяка седмица“ при
          запис.
        </p>
        {rules.length === 0 ? (
          <p className="empty">Няма повтарящи се посещения.</p>
        ) : (
          <ul className="admin-list">
            {[...activeRules, ...stoppedRules].map((r) => {
              const active = isActive(r, now.date);
              const next = active ? nextOccurrence(r, now.date, closedAll) : null;
              return (
                <li key={r.id} className={active ? "admin-item" : "admin-item is-stopped"}>
                  <div className="admin-item__who">
                    <strong>
                      <RecurIcon /> {r.patientName ?? r.bookerName}
                    </strong>
                    <span className="muted">
                      {describeWeekdays(r.weekdays)}, {formatTime(r.time)} ч. ·{" "}
                      <a href={`tel:${r.phone}`} className="tabular nowrap">
                        {formatBgPhone(r.phone)}
                      </a>
                    </span>
                    <div className="muted" style={{ fontSize: "var(--step--1)" }}>
                      {active
                        ? next
                          ? `Следващо: ${formatLongDate(next)}`
                          : "Няма предстоящи посещения"
                        : `Спряно — последно посещение ${formatLongDate(r.endDate!)}`}
                    </div>
                  </div>
                  <div className="admin-item__actions">
                    <Link href={weekHref(monday, `&rec=${r.id}`)} scroll={false} className="btn btn--ghost btn--small">
                      Редактирай
                    </Link>
                    {active ? (
                      <ConfirmButton
                        action={stopRecurringAction}
                        fields={{ recId: r.id, from: now.date, week: monday }}
                        label="Спри"
                        confirmLabel="Спри от днес"
                        pendingLabel="Спиране…"
                        danger={false}
                        ariaLabel={`Спри повторенията на ${r.patientName ?? r.bookerName}`}
                      />
                    ) : (
                      <form action={resumeRecurringAction}>
                        <input type="hidden" name="recId" value={r.id} readOnly />
                        <input type="hidden" name="week" value={monday} readOnly />
                        <Submit className="btn btn--small" pendingLabel="Подновяване…">
                          Поднови
                        </Submit>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- Панел за редакция ---------- */}
      {sheet ? (
        <AdminSheet key={`${editId}-${recId}-${nw}-${one(sp.on)}`} title={sheet.title} closeHref={closeHref}>
          {sheet.mode === "single" && sheet.b ? (
            <p className="muted" style={{ fontSize: "var(--step--1)", marginTop: "-0.5rem" }}>
              {formatLongDate(sheet.b.date)}, {formatTime(sheet.b.time)} ч.
              {sheet.b.patientName ? ` · записан от ${sheet.b.bookerName}` : ""}
              <br />
              Записан на {formatDateTime(sheet.b.createdAt)}
            </p>
          ) : null}

          {sheet.mode === "rule" ? (
            <p className="rec-summary">
              <RecurIcon />
              <span>
                {describeWeekdays(sheet.r.weekdays)}, {formatTime(sheet.r.time)} ч.
                <br />
                <span className="muted">
                  от {formatLongDate(sheet.r.startDate)}
                  {sheet.r.endDate ? ` до ${formatLongDate(sheet.r.endDate)}` : ", без край"}
                </span>
              </span>
            </p>
          ) : null}

          {sheet.mode === "rule" && sheet.on ? (
            <div className="sheet__once-box">
              <div className="sheet__once-head">
                <strong>Само за {formatLongDate(sheet.on)}</strong>
                <ConfirmButton
                  action={skipOccurrenceAction}
                  fields={{ recId: sheet.r.id, on: sheet.on, week: monday }}
                  label="Пропусни тази дата"
                  confirmLabel="Да, пропусни"
                  pendingLabel="Пропускане…"
                  danger={false}
                  ariaLabel={`Пропусни посещението на ${formatLongDate(sheet.on)}`}
                />
              </div>
              <MoveOccurrenceForm
                recId={sheet.r.id}
                on={sheet.on}
                onLabel={formatLongDate(sheet.on)}
                times={times}
                defaultTime={sheet.r.time}
                week={monday}
              />
            </div>
          ) : null}

          {sheet.mode === "rule" ? <h3 className="sheet__section">Цялата поредица</h3> : null}

          <EditBookingForm values={sheet.values} times={times} closeHref={closeHref} week={monday} />

          {sheet.mode === "single" && sheet.b ? (
            <div className="sheet__danger">
              <p className="muted" style={{ margin: 0 }}>
                Изтриването освобождава мястото в календара.
              </p>
              <ConfirmButton
                action={deleteBookingAction}
                fields={{ id: sheet.b.id, week: monday }}
                label="Изтрий консултацията"
                confirmLabel="Да, изтрий"
                ariaLabel={`Изтрий консултацията на ${sheet.b.patientName ?? sheet.b.bookerName}`}
              />
            </div>
          ) : null}

          {sheet.mode === "rule" ? (
            <div className="sheet__danger">
              {isActive(sheet.r, now.date) ? (
                <ConfirmButton
                  action={stopRecurringAction}
                  fields={{ recId: sheet.r.id, from: sheet.on ?? now.date, week: monday }}
                  label={sheet.on ? "Спри повторенията от тази дата" : "Спри повторенията от днес"}
                  confirmLabel="Да, спри"
                  pendingLabel="Спиране…"
                  danger={false}
                  ariaLabel="Спри повторенията"
                />
              ) : (
                <form action={resumeRecurringAction}>
                  <input type="hidden" name="recId" value={sheet.r.id} readOnly />
                  <input type="hidden" name="week" value={monday} readOnly />
                  <Submit className="btn btn--small" pendingLabel="Подновяване…">
                    Поднови повторенията
                  </Submit>
                </form>
              )}
              <ConfirmButton
                action={deleteRecurringAction}
                fields={{ recId: sheet.r.id, week: monday }}
                label="Изтрий изцяло"
                confirmLabel="Да, изтрий поредицата"
                ariaLabel="Изтрий цялата поредица, вкл. миналите посещения"
              />
            </div>
          ) : null}
        </AdminSheet>
      ) : null}

      {/* ---------- Почивни дни ---------- */}
      <section className="section" aria-labelledby="closed-title" style={{ paddingBottom: 0 }}>
        <h2 id="closed-title" style={{ fontSize: "var(--step-2)" }}>
          Почивни дни
        </h2>
        <p className="muted prose">
          Затворените дни не могат да се записват онлайн, а повтарящите се посещения в тях се пропускат. Официалните
          празници се затварят автоматично; добавете тук отпуск и пренесените почивни дни.
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
                    danger={false}
                    pendingLabel="Отваряне…"
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
