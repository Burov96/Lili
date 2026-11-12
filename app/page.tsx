import Link from "next/link";
import { CalendarIcon, Heart, PhoneIcon, Wave } from "@/components/Decor";
import { HeroAnimation } from "@/components/HeroAnimation";
import { businessJsonLd, JsonLd } from "@/components/JsonLd";
import { booking, dayEnd, site } from "@/lib/config";
import { formatTime } from "@/lib/format";
import { services, servicesIntro, servicesOutro } from "@/lib/services";

export default function HomePage() {
  const hours = `${formatTime(booking.firstStart)}–${formatTime(dayEnd)}`;
  return (
    <>
      <JsonLd data={businessJsonLd()} />

      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__grid">
          <div className="hero__art">
            <HeroAnimation />
          </div>
          <div>
            <h1 id="hero-title" className="hero__title">
              Логопедичен кабинет
              <span className="hero__slogan">„{site.slogan}“</span>
            </h1>
            <p className="hero__name">
              <span>{site.therapist}, логопед</span>
            </p>
            <p className="lead prose">
              Терапия на речта и езика за деца и възрастни — с ясен план и упражнения, които
              продължават у дома между посещенията.
            </p>
            <div className="hero__actions">
              <Link href="/zapazi-chas" className="btn">
                <CalendarIcon />
                Запази час онлайн
              </Link>
              <a href={`tel:${site.phoneIntl}`} className="btn btn--ghost">
                <PhoneIcon />
                <span className="nowrap">{site.phoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Wave />

      <section className="section section--tint" aria-labelledby="services-title" style={{ paddingTop: "1.5rem" }}>
        <div className="container">
          <div className="section__head">
            <h2 id="services-title">Услуги</h2>
            <p className="muted">{servicesIntro}</p>
          </div>
          <ul className="services">
            {services.map((s) => (
              <li key={s.slug} className="service">
                <Heart color={s.color} />
                <div>
                  <h3>
                    <Link href={`/uslugi/${s.slug}`}>{s.title}</Link>
                  </h3>
                  <p>{s.summary}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="services-outro prose">{servicesOutro}</p>
        </div>
      </section>

      <section className="section" aria-labelledby="how-title">
        <div className="container">
          <div className="section__head">
            <h2 id="how-title">Как да запазите час</h2>
            <p className="muted">
              Часовете са от понеделник до петък, {hours}. Записването отнема около минута.
            </p>
          </div>
          <ol className="steps">
            <li>
              <div>
                <h3>Изберете ден</h3>
                <p>Календарът показва свободните дни до {booking.weeksAhead} седмици напред.</p>
              </div>
            </li>
            <li>
              <div>
                <h3>Изберете час</h3>
                <p>Часовете започват на всеки половин час — от {formatTime(booking.firstStart)} нататък.</p>
              </div>
            </li>
            <li>
              <div>
                <h3>Оставете име и телефон</h3>
                <p>Ако записвате детето си, добавете и неговото име.</p>
              </div>
            </li>
          </ol>
          <Link href="/zapazi-chas" className="btn">
            <CalendarIcon />
            Към календара
          </Link>
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="about-title">
        <div className="container split">
          <div className="prose">
            <h2 id="about-title">За логопеда</h2>
            <p>
              {site.therapist} е дипломиран логопед, завършила „Логопедия“ в Нов български университет, с над 5
              години опит. Работи с деца и възрастни — от първите думи до възстановяването на речта след
              заболяване.
            </p>
            <blockquote className="motto">
              <p>Всяка малка крачка напред има значение, а всяка дума заслужава подкрепа.</p>
            </blockquote>
            <Link href="/za-logopeda">Повече за {site.therapist}</Link>
          </div>
          <div className="callout">
            <div>
              <h2>Имате въпрос?</h2>
              <p>Обадете се — ще ви помогнем да прецените дали е време за консултация.</p>
            </div>
            <div>
              <a className="callout__phone nowrap" href={`tel:${site.phoneIntl}`}>
                {site.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
