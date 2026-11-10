/**
 * Нормализира български телефонен номер до вида 0XXXXXXXXX.
 * Приема +359…, 00359…, 0…, с интервали, тирета и скоби.
 * Връща null, ако номерът не изглежда валиден.
 */
export function normalizeBgPhone(raw: string): string | null {
  let s = raw.replace(/[\s\-().\/]/g, "");
  if (s.startsWith("00359")) s = "+359" + s.slice(5);
  if (s.startsWith("+359")) s = "0" + s.slice(4);
  else if (s.startsWith("359") && s.length >= 11) s = "0" + s.slice(3);
  // мобилни: 08X XXX XXXX (10 цифри); стационарни: 9–10 цифри
  if (/^08[7-9]\d{7}$/.test(s)) return s;
  if (/^0[2-79]\d{7,8}$/.test(s)) return s;
  return null;
}

/** 0896318322 → „0896 318 322“ */
export function formatBgPhone(phone: string): string {
  if (/^08\d{8}$/.test(phone)) return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  return phone;
}
