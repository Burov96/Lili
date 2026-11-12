"use server";

import { revalidatePath } from "next/cache";
import { booking } from "@/lib/config";
import { formatLongDate, formatTime } from "@/lib/format";
import { notifyNewBooking } from "@/lib/notify";
import { formatBgPhone, normalizeBgPhone } from "@/lib/phone";
import { nowInSofia, validateSlot } from "@/lib/slots";
import { expandRecurring } from "@/lib/recurring";
import { getStore } from "@/lib/store";
import type { BookingField, BookingState, BookingValues } from "./types";

const str = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").replace(/\s+/g, " ").trim().slice(0, max);

export async function createBooking(prev: BookingState, form: FormData): Promise<BookingState> {
  const attempt = prev.attempt + 1;
  const values: BookingValues = {
    name: str(form.get("name"), 80),
    forOther: form.get("forOther") === "on",
    patientName: str(form.get("patientName"), 80),
    phone: str(form.get("phone"), 30),
    note: (typeof form.get("note") === "string" ? String(form.get("note")) : "").trim().slice(0, 500),
  };

  const fail = (message: string, errors: Partial<Record<BookingField, string>> = {}): BookingState => ({
    status: "error",
    attempt,
    message,
    errors,
    values,
  });

  // Капан за ботове: полето е скрито за хората.
  if (str(form.get("website"), 200)) {
    return fail("Записването не беше прието. Обадете се, за да запазите час.");
  }

  const errors: Partial<Record<BookingField, string>> = {};
  if (values.name.length < 2) errors.name = "Въведете име и фамилия.";
  if (values.forOther && values.patientName.length < 2) {
    errors.patientName = "Въведете името на човека, за когото е часът.";
  }
  const phone = normalizeBgPhone(values.phone);
  if (!phone) errors.phone = "Въведете български телефонен номер, напр. 0888 123 456.";
  if (form.get("consent") !== "on") errors.consent = "Нужно е съгласие, за да запазим часа.";

  if (Object.keys(errors).length) {
    return fail("Проверете отбелязаните полета.", errors);
  }

  const store = getStore();
  const now = nowInSofia();
  const closed = await store.closedDays(now.date);
  const slot = validateSlot(form.get("date"), form.get("time"), closed, now);
  if (!slot.ok) return fail(slot.error, { slot: slot.error });

  // Повтарящите се посещения също заемат места в часа.
  const recurringHere = expandRecurring(await store.listRecurring(), slot.date, slot.date, closed).filter(
    (o) => o.time === slot.time,
  ).length;
  const capacityLeft = booking.capacityPerSlot - recurringHere;

  const patientName = values.forOther ? values.patientName : null;
  const result = await store.insertBooking(
    {
      date: slot.date,
      time: slot.time,
      bookerName: values.name,
      patientName,
      phone: phone!,
      note: values.note || null,
    },
    capacityLeft,
  );

  if (result === "full") {
    revalidatePath("/zapazi-chas");
    const msg = "Междувременно този час се запълни. Изберете друг час.";
    return fail(msg, { slot: msg });
  }
  if (result === "duplicate") {
    return fail("Този час вече е запазен за същия човек и телефон. Не е нужно да записвате отново.");
  }

  await notifyNewBooking({
    date: slot.date,
    time: slot.time,
    bookerName: values.name,
    patientName,
    phone: phone!,
    note: values.note || null,
  });

  revalidatePath("/zapazi-chas");
  revalidatePath("/admin");

  return {
    status: "success",
    attempt,
    slot: `${slot.date}|${slot.time}`,
    when: `${formatLongDate(slot.date)}, ${formatTime(slot.time)} ч.`,
    who: patientName ?? values.name,
    phone: formatBgPhone(phone!),
  };
}
