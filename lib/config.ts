/**
 * Всички настройки на сайта на едно място.
 * Промени тук работното време, капацитета и данните за контакт.
 */

export const site = {
  name: "Логопедичен кабинет „Речта започва у дома“",
  shortName: "Речта започва у дома",
  slogan: "Речта започва у дома",
  therapist: "Лиляна Ловчанска",
  jobTitle: "Логопед",
  phone: "0896318322",
  phoneDisplay: "0896 318 322",
  phoneIntl: "+359896318322",
  email: "", // напр. "lili@example.bg" — показва се само ако е попълнен
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  locale: "bg_BG",
  /**
   * ВАЖНО за локалното SEO: попълни адреса, щом е ясен.
   * Празните полета просто не се показват.
   */
  address: {
    street: "",
    city: "",
    postalCode: "",
    region: "",
    country: "BG",
  },
  geo: null as null | { lat: number; lng: number },
  description:
    "Логопед Лиляна Ловчанска: индивидуална подкрепа за деца и възрастни — езиково развитие, звукопроизношение, афазии след инсулт, домашни посещения, аутизъм, деца със СОП и обучителни трудности. Запазете час онлайн.",
} as const;

export const booking = {
  timeZone: "Europe/Sofia",
  /** Начало на първия час, в минути от полунощ (15:00). */
  firstStart: 15 * 60,
  /** Начало на последния час, в минути от полунощ (18:30). */
  lastStart: 18 * 60 + 30,
  /** През колко минути започват часовете. */
  slotMinutes: 30,
  /** Колко души могат да запишат един и същи час. */
  capacityPerSlot: 3,
  /** Колко седмици напред може да се записва. */
  weeksAhead: 4,
  /** Час не може да се запише по-късно от толкова минути преди началото му. */
  minLeadMinutes: 60,
  /** Колко дни след посещението се пазят личните данни (виж /poveritelnost). */
  retentionDays: 180,
} as const;

/** Всички начални часове в минути от полунощ: 900 (15:00), 930 (15:30) … */
export const slotTimes: number[] = Array.from(
  { length: Math.floor((booking.lastStart - booking.firstStart) / booking.slotMinutes) + 1 },
  (_, i) => booking.firstStart + i * booking.slotMinutes,
);

/** Край на работния ден в минути (след последния час). */
export const dayEnd = booking.lastStart + booking.slotMinutes;
