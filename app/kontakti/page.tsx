import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CalendarIcon, PhoneIcon } from "@/components/Decor";
import { booking, dayEnd, site } from "@/lib/config";
import { formatTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Контакти",
  description: `Телефон за връзка с логопед ${site.therapist}: ${site.phoneDisplay}. Работно време: понеделник – петък от ${formatTime(booking.firstStart)} ч.`,
  alternates: { canonical: "/kontakti" },
};

export default function ContactsPage() {
  const { street, city, postalCode } = site.address;
  const hasAddress = Boolean(street || city);
  return (
    <>
      <div className="container page-head">
        <Breadcrumbs items={[{ name: "Контакти", path: "/kontakti" }]} />
        <h1>Контакти</h1>
      </div>
      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container info-grid">
          <div>
            <h2 style={{ fontSize: "var(--step-1)" }}>Телефон</h2>
            <p>
              <a href={`tel:${site.phoneIntl}`} className="callout__phone" style={{ color: "var(--ink)" }}>
                <span className="nowrap">{site.phoneDisplay}</span>
              </a>
            </p>
            {site.email ? (
              <>
                <h2 style={{ fontSize: "var(--step-1)" }}>Имейл</h2>
                <p>
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                </p>
              </>
            ) : null}
            <h2 style={{ fontSize: "var(--step-1)" }}>Работно време</h2>
            <p className="tabular">
              Понеделник – петък
              <br />
              {formatTime(booking.firstStart)}–{formatTime(dayEnd)}
            </p>
            {hasAddress ? (
              <>
                <h2 style={{ fontSize: "var(--step-1)" }}>Адрес</h2>
                <address style={{ fontStyle: "normal" }}>
                  {street}
                  {street && city ? <br /> : null}
                  {postalCode ? `${postalCode} ` : ""}
                  {city}
                </address>
              </>
            ) : null}
          </div>
          <div className="callout" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <h2>Запишете час</h2>
              <p>Изберете удобен ден и час в календара или се обадете.</p>
            </div>
            <div className="hero__actions" style={{ marginTop: 0 }}>
              <Link href="/zapazi-chas" className="btn">
                <CalendarIcon />
                Запази час онлайн
              </Link>
              <a href={`tel:${site.phoneIntl}`} className="btn btn--ghost">
                <PhoneIcon />
                Обади се
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
