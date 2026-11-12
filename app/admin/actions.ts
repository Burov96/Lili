"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, isAdmin, startSession } from "@/lib/auth";
import { slotTimes } from "@/lib/config";
import { normalizeBgPhone } from "@/lib/phone";
import { addDays, isDateStr, nowInSofia, startOfWeek } from "@/lib/slots";
import { getStore } from "@/lib/store";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const pw = String(form.get("password") ?? "");
  if (!checkPassword(pw)) {
    // малко забавяне срещу налучкване на паролата
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Грешна парола. Опитайте отново." };
  }
  await startSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin");
}

async function guard() {
  if (!(await isAdmin())) redirect("/admin");
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/zapazi-chas");
}

const weekOf = (form: FormData) => {
  const w = form.get("week");
  return isDateStr(w) ? w : startOfWeek(nowInSofia().date);
};

/* ---------------- Записи (еднократни и повтарящи се) ---------------- */

export type EditField = "name" | "patientName" | "phone" | "date" | "time" | "weekdays";
export type EditState = { error?: string; errors?: Partial<Record<EditField, string>> };

const clean = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Запазва запис от панела:
 *  - еднократен (нов или редакция, вкл. преместване на друг ден/час);
 *  - с „Повтаряй“ — превръща се в повтарящо се посещение;
 *  - редакция на повтарящо се посещение (recId) — важи за всички посещения от поредицата.
 */
export async function saveBookingAction(_prev: EditState, form: FormData): Promise<EditState> {
  await guard();
  const id = Number(form.get("id")) || null;
  const recId = Number(form.get("recId")) || null;
  const repeat = recId !== null || form.get("repeat") === "on";
  const name = clean(form.get("name"), 80);
  const forOther = form.get("forOther") === "on";
  const patientName = clean(form.get("patientName"), 80);
  const phone = normalizeBgPhone(clean(form.get("phone"), 30));
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  const date = form.get("date");
  const time = Number(form.get("time"));
  const weekdays = form
    .getAll("wd")
    .map(Number)
    .filter((n) => n >= 1 && n <= 5);

  const errors: Partial<Record<EditField, string>> = {};
  if (name.length < 2) errors.name = "Въведете име.";
  if (forOther && patientName.length < 2) errors.patientName = "Въведете името на детето/посетителя.";
  if (!phone) errors.phone = "Невалиден телефон, напр. 0888 123 456.";
  if (!isDateStr(date)) errors.date = "Изберете дата.";
  if (!slotTimes.includes(time)) errors.time = "Изберете час.";
  if (repeat && weekdays.length === 0) errors.weekdays = "Изберете поне един ден от седмицата.";
  if (Object.keys(errors).length) return { error: "Проверете отбелязаните полета.", errors };

  const person = {
    bookerName: name,
    patientName: forOther ? patientName : null,
    phone: phone!,
    note: note || null,
  };
  const store = getStore();
  const d = date as string;

  if (repeat) {
    let ruleId: number;
    if (recId) {
      const existing = await store.getRecurring(recId);
      if (!existing) return { error: "Повтарящото се посещение вече не съществува." };
      await store.updateRecurring(recId, { ...person, weekdays, time, startDate: d, endDate: existing.endDate });
      ruleId = recId;
    } else {
      ruleId = await store.insertRecurring({ ...person, weekdays, time, startDate: d, endDate: null });
      // Еднократният запис, от който е направено повторението, вече е част от поредицата.
      if (id) await store.deleteBooking(id);
    }
    refresh();
    redirect(`/admin?week=${startOfWeek(d)}&savedRec=${ruleId}`);
  }

  let savedId: number;
  if (id) {
    if (!(await store.getBooking(id))) return { error: "Записът вече не съществува — може да е изтрит." };
    await store.updateBooking(id, { ...person, date: d, time });
    savedId = id;
  } else {
    savedId = await store.adminInsert({ ...person, date: d, time });
  }
  refresh();
  redirect(`/admin?week=${startOfWeek(d)}&saved=${savedId}`);
}

export async function deleteBookingAction(form: FormData): Promise<void> {
  await guard();
  const id = Number(form.get("id"));
  if (Number.isInteger(id) && id > 0) await getStore().deleteBooking(id);
  refresh();
  redirect(`/admin?week=${weekOf(form)}&deleted=1`);
}

/* ---------------- Повтарящи се: отделни посещения и поредицата ---------------- */

/** Пропуска само едно посещение от поредицата. */
export async function skipOccurrenceAction(form: FormData): Promise<void> {
  await guard();
  const recId = Number(form.get("recId"));
  const date = form.get("on");
  if (recId && isDateStr(date)) await getStore().addRecurringSkip(recId, date);
  refresh();
  redirect(`/admin?week=${weekOf(form)}&skipped=1`);
}

export type MoveState = { error?: string };

/** Мести само едно посещение: пропуска го в поредицата и създава еднократен запис на новия ден/час. */
export async function moveOccurrenceAction(_prev: MoveState, form: FormData): Promise<MoveState> {
  await guard();
  const recId = Number(form.get("recId"));
  const on = form.get("on");
  const newDate = form.get("newDate");
  const newTime = Number(form.get("newTime"));
  if (!isDateStr(on) || !isDateStr(newDate) || !slotTimes.includes(newTime)) {
    return { error: "Изберете нова дата и час." };
  }
  const store = getStore();
  const rule = await store.getRecurring(recId);
  if (!rule) return { error: "Повтарящото се посещение вече не съществува." };
  await store.addRecurringSkip(recId, on);
  const newId = await store.adminInsert({
    date: newDate,
    time: newTime,
    bookerName: rule.bookerName,
    patientName: rule.patientName,
    phone: rule.phone,
    note: rule.note,
  });
  refresh();
  redirect(`/admin?week=${startOfWeek(newDate)}&saved=${newId}`);
}

/** Спира поредицата: последното посещение е денят преди `from`. */
export async function stopRecurringAction(form: FormData): Promise<void> {
  await guard();
  const recId = Number(form.get("recId"));
  const from = form.get("from");
  const start = isDateStr(from) ? from : nowInSofia().date;
  if (recId) await getStore().setRecurringEnd(recId, addDays(start, -1));
  refresh();
  redirect(`/admin?week=${weekOf(form)}&stopped=1`);
}

/** Подновява спряна поредица от днес нататък. */
export async function resumeRecurringAction(form: FormData): Promise<void> {
  await guard();
  const recId = Number(form.get("recId"));
  const store = getStore();
  const rule = recId ? await store.getRecurring(recId) : null;
  if (rule) {
    const today = nowInSofia().date;
    const { id: _id, createdAt: _c, skips: _s, ...rest } = rule;
    await store.updateRecurring(recId, {
      ...rest,
      startDate: rule.startDate > today ? rule.startDate : today,
      endDate: null,
    });
  }
  refresh();
  redirect(`/admin?week=${weekOf(form)}&resumed=1`);
}

/** Изтрива поредицата изцяло (и миналите, и бъдещите посещения). */
export async function deleteRecurringAction(form: FormData): Promise<void> {
  await guard();
  const recId = Number(form.get("recId"));
  if (recId) await getStore().deleteRecurring(recId);
  refresh();
  redirect(`/admin?week=${weekOf(form)}&deleted=1`);
}

/* ---------------- Почивни дни ---------------- */

export async function addClosedDayAction(form: FormData): Promise<void> {
  await guard();
  const date = form.get("date");
  const reason = String(form.get("reason") ?? "").trim().slice(0, 80) || "почивен ден";
  if (isDateStr(date)) await getStore().addClosedDay(date, reason);
  refresh();
}

export async function removeClosedDayAction(form: FormData): Promise<void> {
  await guard();
  const date = form.get("date");
  if (isDateStr(date)) await getStore().removeClosedDay(date);
  refresh();
}
