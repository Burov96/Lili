import type { Metadata } from "next";
import Link from "next/link";
import { BookingForm } from "@/components/BookingForm";
import { BookingScroll } from "@/components/BookingScroll";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { booking, site, slotHours } from "@/lib/config";
import {
  formatDayNumber,
  formatHour,
  formatLongDate,
  formatMonthShort,
  formatMonthYear,
  formatSlot,
  spotsLabel,
} from "@/lib/format";
import { calendarDays, isDateStr, nowInSofia, slotNotTooLate, startOfWeek, type DayInfo } from "@/lib/slots";
import { getStore, slotKey } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Запази час онлайн",
  description: `Запазете час при логопед ${site.therapist} онлайн — свободни часове от понеделник до петък от ${booking.firstHour}:00 ч.`,
  alternates: { canonical: "/zapazi-chas" },
};

type Props = { searchParams: Promise<{ date?: string | string[]; hour?: string | string[] }> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const DOW = ["пн", "вт", "ср", "чт", "пт"];

export default async function BookingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const store = getStore();
  const now = nowInSofia();
  const closed = await store.closedDays(startOfWeek(now.date));
  const days = calendarDays(closed, now);
  const counts = await store.slotCounts(days[0].date, days[days.length - 1].date);

  const freeIn = (date: string, hour: number) =>
    Math.max(0, booking.capacityPerSlot - (counts.get(slotKey(date, hour)) ?? 0));

  const freeOnDay = (d: DayInfo) =>
    d.closed || d.past
      ? 0
      : slotHours.filter((h) => slotNotTooLate(d.date, h, now)).reduce((sum, h) => sum + freeIn(d.date, h), 0);

  const dateParam = one(sp.date);
  const selectedDay = isDateStr(dateParam) ? days.find((d) => d.date === dateParam) : undefined;
  const dayOpen = selectedDay && freeOnDay(selectedDay) > 0 ? selectedDay : undefined;

  const hourParam = Number(one(sp.hour));
  const hourOk =
    dayOpen && slotHours.includes(hourParam) && slotNotTooLate(dayOpen.date, hourParam, now) && freeIn(dayOpen.date, hourParam) > 0;
  const selectedHour = hourOk ? hourParam : undefined;
  // Формата остава видима за избрания час дори ако той току-що се е запълнил —
  // иначе последният записал се няма да види потвърждението си.
  const requested = selectedDay && slotHours.includes(hourParam) ? { date: selectedDay.date, hour: hourParam } : undefined;

  const first = days[0].date;
  const last = days[days.length - 1].date;
  const range =
    formatMonthYear(first) === formatMonthYear(last)
      ? formatMonthYear(first)
      : `${formatMonthYear(first)} – ${formatMonthYear(last)}`;
  const fewThreshold = Math.max(1, Math.floor((booking.capacityPerSlot * slotHours.length) / 3));

  return (
    <>
      <div className="container page-head">
        <Breadcrumbs items={[{ name: "Запази час", path: "/zapazi-chas" }]} />
        <h1>Запази час</h1>
        <p className="lead prose">
          Часовете са от понеделник до петък, {formatHour(booking.firstHour)}–{formatHour(booking.lastHour + 1)}. За
          спешен въпрос се обадете на{" "}
          <a href={`tel:${site.phoneIntl}`} className="nowrap">
            {site.phoneDisplay}
          </a>
          .
        </p>
      </div>

      <BookingScroll date={selectedDay?.date ?? null} hour={requested ? requested.hour : null} />
      <div className="container booking">
        <div>
          <section className="booking__step" aria-labelledby="step-day">
            <h2 id="step-day">
              <span className="step-num" aria-hidden="true">
                1
              </span>
              Изберете ден
            </h2>
            <div className="cal">
              <p className="cal__range">{range}</p>
              <div className="cal__grid" aria-hidden="true">
                {DOW.map((d) => (
                  <span key={d} className="cal__dow">
                    {d}
                  </span>
                ))}
              </div>
              <ul className="cal__grid" aria-label="Дни">
                {days.map((d, i) => {
                  const free = freeOnDay(d);
                  const label = formatLongDate(d.date);
                  const showMonth = i === 0 || formatDayNumber(d.date) === "1";
                  const num = (
                    <>
                      <span className="cal__num">{formatDayNumber(d.date)}</span>
                      {showMonth ? <span className="cal__meta">{formatMonthShort(d.date)}</span> : null}
                    </>
                  );
                  if (d.past) {
                    return (
                      <li key={d.date}>
                        <span className="cal__day cal__day--off" aria-label={`${label} — отминал`}>
                          {num}
                        </span>
                      </li>
                    );
                  }
                  if (d.closed) {
                    return (
                      <li key={d.date}>
                        <span
                          className="cal__day cal__day--off"
                          title={d.closedReason}
                          aria-label={`${label} — затворено (${d.closedReason})`}
                        >
                          {num}
                          <span className="cal__meta">почивен</span>
                        </span>
                      </li>
                    );
                  }
                  if (free === 0) {
                    return (
                      <li key={d.date}>
                        <span className="cal__day cal__day--full" aria-label={`${label} — няма свободни часове`}>
                          {num}
                          <span className="cal__meta">зает</span>
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={d.date}>
                      <Link
                        href={`/zapazi-chas?date=${d.date}`}
                        className="cal__day"
                        aria-current={dayOpen?.date === d.date ? "true" : undefined}
                        aria-label={`${label} — ${spotsLabel(free)}`}
                        scroll={false}
                      >
                        {num}
                        <span className={free <= fewThreshold ? "cal__dot cal__dot--few" : "cal__dot"} aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <ul className="cal__legend" aria-hidden="true">
                <li>
                  <span className="cal__dot" /> свободни часове
                </li>
                <li>
                  <span className="cal__dot cal__dot--few" /> малко места
                </li>
              </ul>
            </div>
          </section>

          <section className="booking__step" aria-labelledby="izberi-chas">
            <h2 id="izberi-chas">
              <span className="step-num" aria-hidden="true">
                2
              </span>
              Изберете час
            </h2>
            {selectedDay && !dayOpen ? (
              <p className="empty reveal">
                За {formatLongDate(selectedDay.date)} няма свободни часове. Изберете друг ден от календара.
              </p>
            ) : !dayOpen ? (
              <p className="empty">Първо изберете ден от календара.</p>
            ) : (
              <>
                <p className="muted reveal" key={`l-${dayOpen.date}`} style={{ marginTop: "-0.25rem" }}>
                  {formatLongDate(dayOpen.date)}
                </p>
                <ul className="slots" key={dayOpen.date}>
                  {slotHours.map((h, i) => {
                    const free = freeIn(dayOpen.date, h);
                    const late = !slotNotTooLate(dayOpen.date, h, now);
                    if (late || free === 0) {
                      return (
                        <li key={h} style={{ ["--i" as string]: i }}>
                          <span className="slot slot--off">
                            <span className="slot__time">{formatSlot(h)}</span>
                            <span className="slot__spots">{late ? "отминал" : "няма места"}</span>
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={h} style={{ ["--i" as string]: i }}>
                        <Link
                          href={`/zapazi-chas?date=${dayOpen.date}&hour=${h}`}
                          className="slot"
                          aria-current={selectedHour === h ? "true" : undefined}
                          scroll={false}
                        >
                          <span className="slot__time">{formatSlot(h)}</span>
                          <span className="slot__spots">{spotsLabel(free)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>

        <section className="panel panel--sticky" aria-labelledby="danni">
          <h2 id="danni" style={{ fontSize: "var(--step-1)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span className="step-num" aria-hidden="true">
              3
            </span>
            Вашите данни
          </h2>
          {requested ? (
            <BookingForm
              date={requested.date}
              hour={requested.hour}
              available={Boolean(hourOk)}
              whenLabel={`${formatLongDate(requested.date)}, ${formatSlot(requested.hour)}`}
            />
          ) : (
            <p className="empty">Изберете ден и час — след това попълнете име и телефон.</p>
          )}
        </section>
      </div>
    </>
  );
}
