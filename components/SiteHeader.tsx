"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/config";
import { CalendarIcon, MenuIcon } from "./Decor";

const links = [
  { href: "/uslugi", label: "Услуги" },
  { href: "/za-logopeda", label: "За логопеда" },
  { href: "/kontakti", label: "Контакти" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Затваряме мобилното меню при навигация.
  useEffect(() => setOpen(false), [pathname]);

  // Esc и клик извън менюто го затварят.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const current = (href: string) =>
    pathname === href || pathname.startsWith(href + "/") ? "page" : undefined;

  return (
    <header className="site-header" ref={headerRef}>
      <div className="container">
        <div className="site-header__bar">
          <Link href="/" className="brand" aria-label={`${site.name} — начало`}>
            <Image src="/logo.png" alt="" width={400} height={346} priority />
            <span className="brand__text">
              <span className="brand__name">Логопедичен кабинет</span>
              <span className="brand__script">„{site.slogan}“</span>
            </span>
          </Link>

          <nav className="nav" aria-label="Основна навигация">
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} aria-current={current(l.href)}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Link href="/zapazi-chas" className="btn btn--small header-cta">
            <CalendarIcon />
            Запази час
          </Link>

          <button
            ref={toggleRef}
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Затвори менюто" : "Отвори менюто"}
            onClick={() => setOpen((v) => !v)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      {/* Леко затъмняване и замъгляване зад отвореното меню */}
      <div
        className="menu-backdrop"
        data-open={open ? "true" : "false"}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      {/* Менюто винаги е в DOM, за да може да се анимира и при затваряне. */}
      <nav
        id="mobile-nav"
        className="mobile-nav"
        aria-label="Мобилна навигация"
        data-open={open ? "true" : "false"}
        inert={!open}
      >
        <ul>
          <li style={{ ["--i" as string]: 0 }}>
            <Link href="/zapazi-chas" aria-current={current("/zapazi-chas")}>
              Запази час
            </Link>
          </li>
          {links.map((l, i) => (
            <li key={l.href} style={{ ["--i" as string]: i + 1 }}>
              <Link href={l.href} aria-current={current(l.href)}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
