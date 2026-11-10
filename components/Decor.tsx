import type { CSSProperties } from "react";

/** Сърцето от банера. Декоративно — скрито от екранни четци. */
export function Heart({ color, className = "heart" }: { color: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 30" aria-hidden="true" focusable="false">
      <path
        fill={color}
        d="M16 29.2c-.5 0-1-.2-1.4-.5C9.4 24.6 1.5 18.4 1.5 10.4 1.5 5.3 5.3 1.5 10 1.5c2.5 0 4.7 1.1 6 3 1.3-1.9 3.5-3 6-3 4.7 0 8.5 3.8 8.5 8.9 0 8-7.9 14.2-13.1 18.3-.4.3-.9.5-1.4.5Z"
      />
    </svg>
  );
}

/** Цветната вълна от долната част на банера. */
export function Wave({ flip = false, style }: { flip?: boolean; style?: CSSProperties }) {
  return (
    <svg
      className="wave"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      style={{ transform: flip ? "scaleY(-1)" : undefined, ...style }}
    >
      <path fill="var(--wave-yellow)" d="M0 58C180 22 340 18 520 46s360 52 560 30 260-48 360-52v136H0Z" />
      <path fill="var(--wave-lime)" d="M0 74c200-30 380-30 560-4s340 40 520 18 240-44 360-44v76H0Z" opacity=".9" />
      <path fill="var(--wave-teal)" d="M0 92c220-22 400-18 580 4s320 24 500 6 260-36 360-34v52H0Z" />
      <path fill="var(--wave-blue)" d="M0 106c240-12 420-8 600 6s320 10 480 0 260-20 360-18v26H0Z" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z"
      />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm13 8H4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9Z"
      />
    </svg>
  );
}

/** Три черти, които се превръщат в ✕ (анимацията е в globals.css). */
export function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="icon menu-icon"
      data-open={open ? "true" : "false"}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <g className="menu-icon__top">
          <path d="M4 7h16" />
        </g>
        <g className="menu-icon__mid">
          <path d="M4 12h16" />
        </g>
        <g className="menu-icon__bot">
          <path d="M4 17h16" />
        </g>
      </g>
    </svg>
  );
}
