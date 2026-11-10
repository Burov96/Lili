"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveBookingAction, type EditState } from "@/app/admin/actions";

/** Странично панелче (на телефон — отдолу), което се отваря през адреса (?edit= / ?new=). */
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
  id: number | null;
  date: string;
  hour: number;
  bookerName: string;
  patientName: string | null;
  phone: string;
  note: string | null;
};

export function EditBookingForm({
  values,
  hours,
  closeHref,
}: {
  values: EditValues;
  /** [час, етикет] — напр. [15, „15:00–16:00 (2 от 3)“] */
  hours: [number, string][];
  closeHref: string;
}) {
  const [state, action, pending] = useActionState<EditState, FormData>(saveBookingAction, {});
  const [forOther, setForOther] = useState(Boolean(values.patientName));
  const e = state.errors ?? {};
  const err = (k: keyof NonNullable<EditState["errors"]>, id: string) =>
    e[k] ? (
      <span id={`${id}-err`} className="field-error">
        {e[k]}
      </span>
    ) : null;
  const inv = (k: keyof NonNullable<EditState["errors"]>, id: string) => ({
    "aria-invalid": e[k] ? true : undefined,
    "aria-describedby": e[k] ? `${id}-err` : undefined,
  });

  return (
    <form action={action} noValidate>
      {values.id ? <input type="hidden" name="id" value={values.id} readOnly /> : null}
      <div aria-live="polite">{state.error ? <p className="alert alert--error reveal">{state.error}</p> : null}</div>

      <fieldset className="sheet__group">
        <legend>Кога</legend>
        <div className="admin-form-row">
          <div className="field">
            <label htmlFor="ed-date">Дата</label>
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
            <label htmlFor="ed-hour">Час</label>
            <select id="ed-hour" name="hour" className="input" defaultValue={values.hour} {...inv("hour", "ed-hour")}>
              {hours.map(([h, label]) => (
                <option key={h} value={h}>
                  {label}
                </option>
              ))}
            </select>
            {err("hour", "ed-hour")}
          </div>
        </div>
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
          <input
            type="checkbox"
            name="forOther"
            checked={forOther}
            onChange={(ev) => setForOther(ev.target.checked)}
          />
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

      <div className="sheet__actions">
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Запазване…" : values.id ? "Запази промените" : "Добави записа"}
        </button>
        <Link href={closeHref} scroll={false} className="btn btn--ghost">
          Отказ
        </Link>
      </div>
    </form>
  );
}
