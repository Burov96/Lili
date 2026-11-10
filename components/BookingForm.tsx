"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { createBooking } from "@/app/zapazi-chas/actions";
import { initialBookingState, type BookingState } from "@/app/zapazi-chas/types";
import { site } from "@/lib/config";
import { Heart } from "./Decor";

type Props = { date: string; hour: number; whenLabel: string; available: boolean };

export function BookingForm({ date, hour, whenLabel, available }: Props) {
  const [state, formAction, pending] = useActionState(createBooking, initialBookingState);
  const successRef = useRef<HTMLDivElement>(null);

  // След успешно записване плъзгаме до потвърждението (важно на телефон).
  useEffect(() => {
    if (state.status !== "success") return;
    const el = successRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.5) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }, [state]);

  // Потвърждението се показва само докато е избран същият час.
  if (state.status === "success" && state.slot === `${date}|${hour}`) {
    return (
      <div ref={successRef} className="success reveal" role="status" aria-live="polite">
        <h2>
          <Heart color="var(--heart-green)" />
          Часът е запазен
        </h2>
        <dl>
          <dt>Кога</dt>
          <dd>{state.when}</dd>
          <dt>За</dt>
          <dd>{state.who}</dd>
          <dt>Телефон</dt>
          <dd className="tabular">{state.phone}</dd>
        </dl>
        <p>
          Ако няма да можете да дойдете, обадете се на{" "}
          <a href={`tel:${site.phoneIntl}`} className="nowrap">
            {site.phoneDisplay}
          </a>
          , за да освободите часа за някой друг.
        </p>
        <Link href="/zapazi-chas" className="btn btn--ghost">
          Запази още един час
        </Link>
      </div>
    );
  }

  if (!available) {
    return (
      <p className="empty reveal">
        Часът ({whenLabel}) вече е зает. <Link href={`/zapazi-chas?date=${date}`} scroll={false}>Изберете друг час</Link>.
      </p>
    );
  }

  return (
    <div className="reveal">
    <form key={state.attempt} action={formAction} noValidate aria-busy={pending}>
      <div className="picked" key={`${date}|${hour}`}>
        <strong>{whenLabel}</strong>
        <Link href={`/zapazi-chas?date=${date}`} scroll={false}>Смени часа</Link>
      </div>
      <input type="hidden" name="date" value={date} readOnly />
      <input type="hidden" name="hour" value={hour} readOnly />
      <Fields state={state} pending={pending} />
    </form>
    </div>
  );
}

function Fields({ state, pending }: { state: BookingState; pending: boolean }) {
  const err = state.status === "error" ? state : null;
  const v = err?.values;
  const [forOther, setForOther] = useState(v?.forOther ?? false);
  const [dirty, setDirty] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // След неуспешно изпращане: фокус върху първото грешно поле (или съобщението).
  useEffect(() => {
    if (!err) return;
    const root = rootRef.current;
    const first = root?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (first ?? root?.querySelector<HTMLElement>(".alert"))?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Предупреждение при напускане с попълнени, но неизпратени данни.
  useEffect(() => {
    if (!dirty || pending) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, pending]);

  const e = err?.errors ?? {};
  const describe = (id: string, hasError: boolean, hint?: string) =>
    [hint, hasError ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;

  return (
    <div ref={rootRef} onInput={() => setDirty(true)}>
      <div aria-live="polite">
        {err ? (
          <p className="alert alert--error reveal" tabIndex={-1}>
            {err.message}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="bf-name">Вашето име</label>
        <input
          id="bf-name"
          name="name"
          className="input"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          placeholder="напр. Мария Иванова…"
          defaultValue={v?.name}
          aria-invalid={e.name ? true : undefined}
          aria-describedby={describe("bf-name", Boolean(e.name))}
        />
        {e.name ? (
          <span id="bf-name-err" className="field-error">
            {e.name}
          </span>
        ) : null}
      </div>

      <label className="check">
        <input
          type="checkbox"
          name="forOther"
          checked={forOther}
          onChange={(ev) => setForOther(ev.target.checked)}
          aria-controls="bf-patient-field"
        />
        <span>Записвам друг човек (напр. детето си)</span>
      </label>

      {forOther ? (
        <div className="field" id="bf-patient-field">
          <label htmlFor="bf-patient">Име на детето или посетителя</label>
          <input
            id="bf-patient"
            name="patientName"
            className="input"
            autoComplete="off"
            required
            minLength={2}
            maxLength={80}
            placeholder="напр. Иван Иванов…"
            defaultValue={v?.patientName}
            aria-invalid={e.patientName ? true : undefined}
            aria-describedby={describe("bf-patient", Boolean(e.patientName))}
          />
          {e.patientName ? (
            <span id="bf-patient-err" className="field-error">
              {e.patientName}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="bf-phone">
          Телефон
          <span className="hint" id="bf-phone-hint">
            За връзка при промяна на часа.
          </span>
        </label>
        <input
          id="bf-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          className="input tabular"
          autoComplete="tel"
          spellCheck={false}
          required
          maxLength={30}
          placeholder="0888 123 456…"
          defaultValue={v?.phone}
          aria-invalid={e.phone ? true : undefined}
          aria-describedby={describe("bf-phone", Boolean(e.phone), "bf-phone-hint")}
        />
        {e.phone ? (
          <span id="bf-phone-err" className="field-error">
            {e.phone}
          </span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="bf-note">
          Бележка <span className="hint">По избор</span>
        </label>
        <textarea
          id="bf-note"
          name="note"
          className="input"
          autoComplete="off"
          maxLength={500}
          rows={3}
          placeholder="напр. възраст на детето, повод за посещението…"
          defaultValue={v?.note}
        />
      </div>

      <div className="field">
        <label className="check check--plain">
          <input
            type="checkbox"
            name="consent"
            required
            aria-invalid={e.consent ? true : undefined}
            aria-describedby={e.consent ? "bf-consent-err" : undefined}
          />
          <span>
            Съгласен/съгласна съм данните да бъдат използвани за записването, според{" "}
            <Link href="/poveritelnost" target="_blank">
              политиката за поверителност
            </Link>
            .
          </span>
        </label>
        {e.consent ? (
          <span id="bf-consent-err" className="field-error">
            {e.consent}
          </span>
        ) : null}
      </div>

      {/* Капан за ботове — скрит от хората и от екранните четци */}
      <div className="hp" aria-hidden="true">
        <label>
          Уебсайт
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button type="submit" className="btn" disabled={pending} style={{ width: "100%" }}>
        {pending ? "Записване…" : "Запази часа"}
      </button>
    </div>
  );
}
