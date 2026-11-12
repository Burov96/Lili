import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CalendarIcon, Heart, PhoneIcon } from "@/components/Decor";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/config";
import { getService, services } from "@/lib/services";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = getService((await params).slug);
  if (!s) return {};
  return {
    title: `${s.title} — логопед`,
    description: s.summary,
    alternates: { canonical: `/uslugi/${s.slug}` },
    openGraph: { title: `${s.title} — логопед ${site.therapist}`, description: s.summary, url: `/uslugi/${s.slug}` },
  };
}

export default async function ServicePage({ params }: Props) {
  const s = getService((await params).slug);
  if (!s) notFound();

  const others = services.filter((x) => x.slug !== s.slug);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: s.title,
          description: s.summary,
          serviceType: "Логопедична терапия",
          url: `${site.url}/uslugi/${s.slug}`,
          provider: { "@id": `${site.url}/#business` },
          inLanguage: "bg",
        }}
      />
      <div className="container page-head">
        <Breadcrumbs
          items={[
            { name: "Услуги", path: "/uslugi" },
            { name: s.title, path: `/uslugi/${s.slug}` },
          ]}
        />
        <h1 className="title-heart">
          <Heart color={s.color} />
          <span>{s.title}</span>
        </h1>
        <p className="lead prose">{s.summary}</p>
      </div>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container info-grid">
          <div className="prose">
            {s.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="hero__actions">
              {s.byPhone ? (
                <a href={`tel:${site.phoneIntl}`} className="btn">
                  <PhoneIcon />
                  Обади се за уговорка
                </a>
              ) : (
                <>
                  <Link href="/zapazi-chas" className="btn">
                    <CalendarIcon />
                    Запази час
                  </Link>
                  <a href={`tel:${site.phoneIntl}`} className="btn btn--ghost">
                    <PhoneIcon />
                    <span className="nowrap">{site.phoneDisplay}</span>
                  </a>
                </>
              )}
            </div>
          </div>
          <div style={{ ["--accent" as string]: s.color }}>
            <h2 style={{ fontSize: "var(--step-1)" }}>{s.signsTitle ?? "Кога да потърсите логопед"}</h2>
            <ul className="check-list">
              {s.signs.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <h2 style={{ fontSize: "var(--step-1)" }}>Как протича работата</h2>
            <ul className="check-list">
              {s.approach.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="other-title">
        <div className="container">
          <h2 id="other-title" style={{ fontSize: "var(--step-2)" }}>
            Други услуги
          </h2>
          <ul className="services">
            {others.map((o) => (
              <li key={o.slug} className="service">
                <Heart color={o.color} />
                <div>
                  <h3>
                    <Link href={`/uslugi/${o.slug}`}>{o.title}</Link>
                  </h3>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
