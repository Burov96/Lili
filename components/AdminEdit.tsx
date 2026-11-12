"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { moveOccurrenceAction, saveBookingAction, type EditState, type MoveState } from "@/app/admin/actions";

/** Странично панелче (на телефон — отдолу), което се отваря през адреса. */
export function AdminSheet({
  title,
  closeHref,
  children,
}: {
  title: string;
  closeHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [closeHref, router]);

  return (
    <div className="sheet-layer">
      <Link href={closeHref} scroll={false} className="sheet-scrim" aria-label="Затвори" tabIndex={-1} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet__head">
          <h2 id="sheet-title" ref={headingRef} tabIndex={-1}>
            {title}
          </h2>
          <Link href={closeHref} scroll={false} className="sheet__close" aria-label="Затвори">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </Link>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}

export type EditValues = {
  /** id на еднократен запис */
  id: number | null;
  /** id на повтарящо се посещение (тогава формата редактира цялата поредица) */
  recId: number | null;
  date: string;
  time: number;
  weekdays: number[];
  bookerName: string;
  patientName: string | null;
  phone: string;
  note: string | null;
};

const WEEKDAYS: [number, string, string][] = [
  [1, "Пн", "понеделник"],
  [2, "Вт", "вторник"],
  [3, "Ср", "сряда"],
  [4, "Чт", "четвъртък"],
  [5, "Пт", "петък"],
];

export function EditBookingForm({
  values,
  times,
  closeHref,
  week,
}: {
  values: EditValues;
  /** [минути, „15:30“] */
  times: [number, string][];
  closeHref: string;
  week: string;
}) {
  const [state, action, pending] = useActionState<EditState, FormData>(saveBookingAction, {});
  const isRule = values.recId !== null;
  const [forOther, setForOther] = useState(Boolean(values.patientName));
  const [repeat, setRepeat] = useState(isRule);
  const [days, setDays] = useState<number[]>(values.weekdays);
  const e = state.errors ?? {};
  type K = keyof NonNullable<EditState["errors"]>;
  const err = (k: K, id: string) =>
    e[k] ? (
      <span id={`${id}-err`} className="field-error">
        {e[k]}
      </span>
    ) : null;
  const inv = (k: K, id: string) => ({
    "aria-invalid": e[k] ? true : undefined,
    "aria-describedby": e[k] ? `${id}-err` : undefined,
  });
  const toggleDay = (d: number) => setDays((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d].sort()));

  return (
    <form action={action} noValidate>
      {values.id ? <input type="hidden" name="id" value={values.id} readOnly /> : null}
      {values.recId ? <input type="hidden" name="recId" value={values.recId} readOnly /> : null}
      <input type="hidden" name="week" value={week} readOnly />
      <div aria-live="polite">{state.error ? <p className="alert alert--error reveal">{state.error}</p> : null}</div>

      <fieldset className="sheet__group">
        <legend>Кога</legend>
        <div className="admin-form-row">
          <div className="field">
            <label htmlFor="ed-date">{repeat ? "Започва от" : "Дата"}</label>
            <input
              id="ed-date"
              name="date"
              type="date"
              className="input"
              defaultValue={values.date}
              required
              autoComplete="off"
              {...inv("date", "ed-date")}
            />
            {err("date", "ed-date")}
          </div>
          <div className="field">
            <label htmlFor="ed-time">Час</label>
            <select id="ed-time" name="time" className="input tabular" defaultValue={values.time} {...inv("time", "ed-time")}>
              {times.map(([t, label]) => (
                <option key={t} value={t}>
                  {label}
                </option>
              ))}
            </select>
            {err("time", "ed-time")}
          </div>
        </div>

        {!isRule ? (
          <label className="check">
            <input type="checkbox" name="repeat" checked={repeat} onChange={(ev) => setRepeat(ev.target.checked)} />
            <span>Повтаряй всяка седмица</span>
          </label>
        ) : null}

        {repeat ? (
          <div className="field reveal">
            <span className="label" id="ed-wd-label">
              В кои дни
              <span className="hint">Отбележете всички за всеки работен ден. Празниците се прескачат автоматично.</span>
            </span>
            <div
              className="wd-picker"
              role="group"
              aria-labelledby="ed-wd-label"
              aria-describedby={e.weekdays ? "ed-wd-err" : undefined}
            >
              {WEEKDAYS.map(([n, short, long]) => (
                <label key={n} className="wd" title={long}>
                  <input
                    type="checkbox"
                    name="wd"
                    value={n}
                    checked={days.includes(n)}
                    onChange={() => toggleDay(n)}
                    aria-label={long}
                  />
                  <span aria-hidden="true">{short}</span>
                </label>
              ))}
              <button
                type="button"
                className="wd-all"
                onClick={() => setDays(days.length === 5 ? [] : [1, 2, 3, 4, 5])}
              >
                {days.length === 5 ? "Изчисти" : "Всички дни"}
              </button>
            </div>
            {err("weekdays", "ed-wd")}
          </div>
        ) : null}
      </fieldset>

      <fieldset className="sheet__group">
        <legend>Кой</legend>
        <div className="field">
          <label htmlFor="ed-name">Име на записващия</label>
          <input
            id="ed-name"
            name="name"
            className="input"
            defaultValue={values.bookerName}
            autoComplete="off"
            maxLength={80}
            {...inv("name", "ed-name")}
          />
          {err("name", "ed-name")}
        </div>
        <label className="check">
          <input type="checkbox" name="forOther" checked={forOther} onChange={(ev) => setForOther(ev.target.checked)} />
          <span>Часът е за друг човек (напр. дете)</span>
        </label>
        {forOther ? (
          <div className="field reveal">
            <label htmlFor="ed-patient">Име на детето/посетителя</label>
            <input
              id="ed-patient"
              name="patientName"
              className="input"
              defaultValue={values.patientName ?? ""}
              autoComplete="off"
              maxLength={80}
              {...inv("patientName", "ed-patient")}
            />
            {err("patientName", "ed-patient")}
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="ed-phone">Телефон</label>
          <input
            id="ed-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            className="input tabular"
            defaultValue={values.phone}
            autoComplete="off"
            spellCheck={false}
            maxLength={30}
            placeholder="0888 123 456…"
            {...inv("phone", "ed-phone")}
          />
          {err("phone", "ed-phone")}
        </div>
        <div className="field">
          <label htmlFor="ed-note">
            Бележка <span className="hint">По избор</span>
          </label>
          <textarea
            id="ed-note"
            name="note"
            className="input"
            rows={3}
            maxLength={500}
            defaultValue={values.note ?? ""}
            autoComplete="off"
          />
        </div>
      </fieldset>

      {isRule ? (
        <p className="muted" style={{ fontSize: "var(--step--1)" }}>
          Промените важат за всички посещения от поредицата.
        </p>
      ) : null}

      <div className="sheet__actions">
        <button type="submit" className="btn" disabled={pending}>
          {pending
            ? "Запазване…"
            : isRule
              ? "Запази поредицата"
              : repeat
                ? "Запази като повтарящо се"
                : values.id
                  ? "Запази промените"
                  : "Добави записа"}
        </button>
        <Link href={closeHref} scroll={false} className="btn btn--ghost">
          Отказ
        </Link>
      </div>
    </form>
  );
}

/** Мести само едно посещение от повтаряща се поредица. */
export function MoveOccurrenceForm({
  recId,
  on,
  onLabel,
  times,
  defaultTime,
  week,
}: {
  recId: number;
  on: string;
  onLabel: string;
  times: [number, string][];
  defaultTime: number;
  week: string;
}) {
  const [state, action, pending] = useActionState<MoveState, FormData>(moveOccurrenceAction, {});
  return (
    <form action={action} className="sheet__once">
      <input type="hidden" name="recId" value={recId} readOnly />
      <input type="hidden" name="on" value={on} readOnly />
      <input type="hidden" name="week" value={week} readOnly />
      <p className="sheet__once-title">Премести само посещението на {onLabel}</p>
      <div className="admin-form-row">
        <div className="field">
          <label htmlFor="mv-date">Нова дата</label>
          <input id="mv-date" name="newDate" type="date" className="input" defaultValue={on} required autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="mv-time">Нов час</label>
          <select id="mv-time" name="newTime" className="input tabular" defaultValue={defaultTime}>
            {times.map(([t, label]) => (
              <option key={t} value={t}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn--ghost" disabled={pending}>
          {pending ? "Преместване…" : "Премести"}
        </button>
      </div>
      <div aria-live="polite">{state.error ? <p className="field-error">{state.error}</p> : null}</div>
    </form>
  );
}
