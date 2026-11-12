import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CalendarIcon, Heart } from "@/components/Decor";
import { site } from "@/lib/config";
import { certificates } from "@/lib/services";

export const metadata: Metadata = {
  title: `За логопеда ${site.therapist}`,
  description: `${site.therapist} — дипломиран логопед, завършила „Логопедия“ в Нов български университет, с над 5 години опит в работата с деца и възрастни.`,
  alternates: { canonical: "/za-logopeda" },
};

const certColors = [
  "var(--heart-pink)",
  "var(--heart-orange)",
  "var(--heart-green)",
  "var(--heart-teal)",
  "var(--heart-purple)",
  "var(--heart-blue)",
  "var(--heart-red)",
  "var(--heart-gold)",
];

export default function AboutPage() {
  return (
    <>
      <div className="container page-head">
        <Breadcrumbs items={[{ name: "За логопеда", path: "/za-logopeda" }]} />
        <h1>{site.therapist}</h1>
        <p className="lead prose">Логопед</p>
      </div>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container about">
          <div className="prose">
            <p>
              Казвам се Лиляна Ловчанска и съм дипломиран логопед, завършила специалност „Логопедия“ в Нов
              български университет – София. Имам над 5 години професионален опит в областта на логопедичната
              работа.
            </p>
            <p>
              В практиката си работя с деца и възрастни, като подхождам индивидуално към потребностите,
              възможностите и темпа на развитие на всеки човек.
            </p>
            <p>
              За мен логопедичната работа е не просто професия, а отговорност и възможност да бъда част от важни
              стъпки в развитието на човека – от първите думи до възстановяването на речта и комуникацията след
              заболяване.
            </p>
            <p>
              Вярвам, че зад всяка трудност стои човек, който има нужда от разбиране, подкрепа и правилен подход.
              Затова се стремя да съчетавам професионалните си знания, практическия опит и индивидуалното
              отношение.
            </p>
            <blockquote className="motto">
              <p>Моята философия е проста: всяка малка крачка напред има значение, а всяка дума заслужава подкрепа.</p>
            </blockquote>
            <p style={{ marginTop: "1.5rem" }}>
              <Link href="/zapazi-chas" className="btn">
                <CalendarIcon />
                Запази час
              </Link>
            </p>
          </div>

          {/* TODO: снимка на Лили и на кабинета — тук, над фактите */}
          <aside className="facts" aria-label="Накратко">
            <dl>
              <div>
                <dt>Образование</dt>
                <dd>„Логопедия“, Нов български университет – София</dd>
              </div>
              <div>
                <dt>Опит</dt>
                <dd>Над 5 години</dd>
              </div>
              <div>
                <dt>Работи с</dt>
                <dd>Деца и възрастни</dd>
              </div>
              <div>
                <dt>Посещения</dt>
                <dd>
                  В кабинета и <Link href="/uslugi/domashni-poseshtenia">у дома</Link>
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="certs-title">
        <div className="container">
          <h2 id="certs-title">Сертификати и допълнителни обучения</h2>
          <ul className="certs">
            {certificates.map((c, i) => (
              <li key={c}>
                <Heart color={certColors[i % certColors.length]} />
                <span>„{c}“</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
