import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CalendarIcon, Heart } from "@/components/Decor";
import { services, servicesIntro, servicesOutro } from "@/lib/services";

export const metadata: Metadata = {
  title: "Логопедични услуги",
  description:
    "Индивидуална логопедична подкрепа за деца и възрастни: езиково развитие, звукопроизношение, афазии след инсулт, домашни посещения, аутизъм, деца със СОП, обучителни трудности и познавателни умения.",
  alternates: { canonical: "/uslugi" },
};

export default function ServicesPage() {
  return (
    <>
      <div className="container page-head">
        <Breadcrumbs items={[{ name: "Услуги", path: "/uslugi" }]} />
        <h1>Логопедични услуги</h1>
        <p className="lead prose">{servicesIntro}</p>
      </div>
      <section className="section" style={{ paddingTop: "1rem" }} aria-label="Списък с услуги">
        <div className="container">
          <ul className="services">
            {services.map((s) => (
              <li key={s.slug} className="service">
                <Heart color={s.color} />
                <div>
                  <h2 className="h3" style={{ fontSize: "var(--step-1)" }}>
                    <Link href={`/uslugi/${s.slug}`} style={{ textDecoration: "none" }}>
                      {s.title}
                    </Link>
                  </h2>
                  <p className="muted" style={{ margin: 0 }}>
                    {s.summary}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="services-outro prose">{servicesOutro}</p>
          <p style={{ marginTop: "2rem" }}>
            <Link href="/zapazi-chas" className="btn">
              <CalendarIcon />
              Запази час
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
