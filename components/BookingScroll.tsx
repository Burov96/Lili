"use client";

import { useEffect, useRef } from "react";

/**
 * Води потребителя към следващата стъпка:
 *  - избран ден  → плъзга до „Изберете час“
 *  - избран час  → плъзга до „Вашите данни“ (и фокусира името на компютър)
 *  - „Смени часа“ → обратно до часовете
 * Не плъзга, ако целта вече е във видимата горна половина на екрана.
 */
export function BookingScroll({ date, hour }: { date: string | null; hour: number | null }) {
  const prev = useRef<{ date: string | null; hour: number | null }>({ date: null, hour: null });

  useEffect(() => {
    const before = prev.current;
    prev.current = { date, hour };

    let targetId: string | null = null;
    if (hour !== null && (hour !== before.hour || date !== before.date)) targetId = "danni";
    else if (date !== null && (date !== before.date || (before.hour !== null && hour === null))) targetId = "izberi-chas";
    if (!targetId) return;

    // Изчакваме един кадър, за да е изрисувано новото съдържание.
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(targetId);
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const comfortable = top >= 0 && top < window.innerHeight * 0.45;
      if (!comfortable) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
      // На телефон не фокусираме, за да не изскочи клавиатурата неочаквано.
      if (targetId === "danni" && window.matchMedia("(pointer: fine)").matches) {
        document.getElementById("bf-name")?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [date, hour]);

  return null;
}
