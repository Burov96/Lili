"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "@/app/admin/actions";

/** Бутон с потвърждение в две стъпки — без изскачащи прозорци. */
export function ConfirmButton({
  action,
  fields,
  label,
  confirmLabel,
  ariaLabel,
}: {
  action: (form: FormData) => Promise<void>;
  fields: Record<string, string | number>;
  label: string;
  confirmLabel: string;
  ariaLabel: string;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" className="btn btn--ghost btn--small" aria-label={ariaLabel} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="admin-item__actions">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} readOnly />
      ))}
      <Submit className="btn btn--danger btn--small" pendingLabel="Изтриване…">
        {confirmLabel}
      </Submit>
      <button type="button" className="btn btn--ghost btn--small" onClick={() => setArmed(false)}>
        Отказ
      </button>
    </form>
  );
}

export function Submit({
  children,
  pendingLabel,
  className = "btn",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="panel" style={{ maxWidth: "26rem" }}>
      {/* Полето за потребител помага на мениджърите на пароли да запомнят входа. */}
      <input type="hidden" name="username" value="lili" autoComplete="username" readOnly />
      <div className="field">
        <label htmlFor="admin-pw">Парола</label>
        <input
          id="admin-pw"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "admin-pw-err" : undefined}
        />
        <div aria-live="polite">
          {state.error ? (
            <span id="admin-pw-err" className="field-error">
              {state.error}
            </span>
          ) : null}
        </div>
      </div>
      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Влизане…" : "Влез"}
      </button>
    </form>
  );
}
