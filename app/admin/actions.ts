"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slotHours } from "@/lib/config";
import { checkPassword, endSession, isAdmin, startSession } from "@/lib/auth";
import { normalizeBgPhone } from "@/lib/phone";
import { isDateStr, startOfWeek } from "@/lib/slots";
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

/* ---------------- Консултации ---------------- */

export type EditField = "name" | "patientName" | "phone" | "date" | "hour";
export type EditState = { error?: string; errors?: Partial<Record<EditField, string>> };

const clean = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").replace(/\s+/g, " ").trim().slice(0, max);

/** Създава нов или запазва редактиран запис (вкл. преместване на друг ден/час). */
export async function saveBookingAction(_prev: EditState, form: FormData): Promise<EditState> {
  await guard();
  const id = Number(form.get("id")) || null;
  const name = clean(form.get("name"), 80);
  const forOther = form.get("forOther") === "on";
  const patientName = clean(form.get("patientName"), 80);
  const phoneRaw = clean(form.get("phone"), 30);
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  const date = form.get("date");
  const hour = Number(form.get("hour"));

  const errors: Partial<Record<EditField, string>> = {};
  if (name.length < 2) errors.name = "Въведете име.";
  if (forOther && patientName.length < 2) errors.patientName = "Въведете името на детето/посетителя.";
  const phone = normalizeBgPhone(phoneRaw);
  if (!phone) errors.phone = "Невалиден телефон, напр. 0888 123 456.";
  if (!isDateStr(date)) errors.date = "Изберете дата.";
  if (!slotHours.includes(hour)) errors.hour = "Изберете час.";
  if (Object.keys(errors).length) return { error: "Проверете отбелязаните полета.", errors };

  const data = {
    date: date as string,
    hour,
    bookerName: name,
    patientName: forOther ? patientName : null,
    phone: phone!,
    note: note || null,
  };

  const store = getStore();
  let savedId: number;
  if (id) {
    if (!(await store.getBooking(id))) return { error: "Записът вече не съществува — може да е изтрит." };
    await store.updateBooking(id, data);
    savedId = id;
  } else {
    savedId = await store.adminInsert(data);
  }
  refresh();
  redirect(`/admin?week=${startOfWeek(data.date)}&saved=${savedId}`);
}

export async function deleteBookingAction(form: FormData): Promise<void> {
  await guard();
  const id = Number(form.get("id"));
  const week = form.get("week");
  if (Number.isInteger(id) && id > 0) await getStore().deleteBooking(id);
  refresh();
  redirect(isDateStr(week) ? `/admin?week=${week}&deleted=1` : "/admin?deleted=1");
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
