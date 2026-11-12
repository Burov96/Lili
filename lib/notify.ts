import "server-only";
import { formatLongDate, formatTime } from "./format";
import { formatBgPhone } from "./phone";
import type { NewBooking } from "./store";

/**
 * Изпраща имейл до Лили за ново записване, ако е настроен Resend.
 * Грешка тук никога не проваля записването.
 */
export async function notifyNewBooking(b: NewBooking): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.NOTIFY_EMAIL_FROM;
  if (!key || !to || !from) return;

  const when = `${formatLongDate(b.date)}, ${formatTime(b.time)} ч.`;
  const lines = [
    `Ново записване: ${when}`,
    "",
    `Записал: ${b.bookerName}`,
    b.patientName ? `За: ${b.patientName}` : null,
    `Телефон: ${formatBgPhone(b.phone)}`,
    b.note ? `Бележка: ${b.note}` : null,
  ].filter((l): l is string => l !== null);

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `Нов час: ${b.patientName ?? b.bookerName} — ${when}`,
        text: lines.join("\n"),
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("[notify] Имейлът не беше изпратен:", e);
  }
}
