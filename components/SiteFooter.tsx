import Link from "next/link";
import { booking, dayEnd, site } from "@/lib/config";
import { formatTime } from "@/lib/format";
import { services } from "@/lib/services";
import { Wave } from "./Decor";

export function SiteFooter() {
  const { street, city } = site.address;
  return (
    <footer className="site-footer">
      <Wave />
      <div className="container">
        <div className="site-footer__grid">
          <div>
            <p className="site-footer__script">„{site.slogan}“</p>
            <p>
              Логопедичен кабинет на {site.therapist}
              {city ? `, ${city}` : ""}.
            </p>
            <p>
              Понеделник – петък, {formatTime(booking.firstStart)}–{formatTime(dayEnd)}
              <br />
              <a href={`tel:${site.phoneIntl}`} className="nowrap">
                {site.phoneDisplay}
              </a>
              {street ? (
                <>
                  <br />
                  {street}
                </>
              ) : null}
            </p>
          </div>
          <div>
            <h2>Услуги</h2>
            <ul>
              {services.map((s) => (
                <li key={s.slug}>
                  <Link href={`/uslugi/${s.slug}`}>{s.title}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Кабинетът</h2>
            <ul>
              <li>
                <Link href="/zapazi-chas">Запази час</Link>
              </li>
              <li>
                <Link href="/za-logopeda">За логопеда</Link>
              </li>
              <li>
                <Link href="/kontakti">Контакти</Link>
              </li>
              <li>
                <Link href="/poveritelnost">Поверителност</Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="site-footer__legal">
          © {new Date().getFullYear()} {site.therapist}
        </p>
      </div>
    </footer>
  );
}
