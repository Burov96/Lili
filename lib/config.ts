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
    "Логопедичен кабинет на Лиляна Ловчанска: терапия при забавено речево развитие, артикулационни нарушения, афазии, аутизъм, деца със СОП и обучителни трудности. Запазете час онлайн.",
} as const;

export const booking = {
  timeZone: "Europe/Sofia",
  /** Първият час за деня (24-часов формат). */
  firstHour: 15,
  /** Последният час, в който може да започне посещение. 18 → последен час 18:00–19:00. */
  lastHour: 18,
  /** Колко души могат да запишат един и същи час. */
  capacityPerSlot: 3,
  /** Колко седмици напред може да се записва. */
  weeksAhead: 4,
  /** Час не може да се запише по-късно от толкова минути преди началото му. */
  minLeadMinutes: 60,
  /** Колко дни след посещението се пазят личните данни (виж /poveritelnost). */
  retentionDays: 180,
} as const;

export const slotHours: number[] = Array.from(
  { length: booking.lastHour - booking.firstHour + 1 },
  (_, i) => booking.firstHour + i,
);
