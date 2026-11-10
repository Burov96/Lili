import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { booking, site } from "@/lib/config";

export const metadata: Metadata = {
  title: "Политика за поверителност",
  description: "Как се обработват личните данни при онлайн записване на час в логопедичния кабинет.",
  alternates: { canonical: "/poveritelnost" },
};

export default function PrivacyPage() {
  return (
    <>
      <div className="container page-head">
        <Breadcrumbs items={[{ name: "Поверителност", path: "/poveritelnost" }]} />
        <h1>Политика за поверителност</h1>
      </div>
      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container prose">
          {/* TODO: прегледай текста с юрист/ДЗЛД, преди сайтът да тръгне публично. */}
          <h2 style={{ fontSize: "var(--step-1)" }}>Администратор на данните</h2>
          <p>
            {site.therapist}, логопед, телефон{" "}
            <a href={`tel:${site.phoneIntl}`} className="nowrap">
              {site.phoneDisplay}
            </a>
            .
          </p>

          <h2 style={{ fontSize: "var(--step-1)" }}>Какви данни събираме</h2>
          <p>
            При онлайн записване на час: вашето име, телефонен номер, името на човека, за когото е часът
            (ако не сте вие — например вашето дете), и бележка, ако решите да оставите такава.
          </p>

          <h2 style={{ fontSize: "var(--step-1)" }}>За какво ги използваме</h2>
          <p>
            Само за да организираме посещението и да се свържем с вас при нужда — например при промяна на
            часа. Данните не се предоставят на трети лица и не се използват за реклама.
          </p>

          <h2 style={{ fontSize: "var(--step-1)" }}>Колко време ги пазим</h2>
          <p>
            Данните от записването се изтриват автоматично {booking.retentionDays} дни след датата на
            посещението.
          </p>

          <h2 style={{ fontSize: "var(--step-1)" }}>Вашите права</h2>
          <p>
            Можете да поискате достъп до данните си, тяхната корекция или изтриване по всяко време, като се
            обадите на{" "}
            <a href={`tel:${site.phoneIntl}`} className="nowrap">
              {site.phoneDisplay}
            </a>
            . Имате право и на жалба до Комисията за защита на личните данни (cpdp.bg).
          </p>

          <h2 style={{ fontSize: "var(--step-1)" }}>Бисквитки</h2>
          <p>
            Сайтът не използва рекламни или проследяващи бисквитки. Използва се само техническа бисквитка за
            вход в администрацията на кабинета.
          </p>
        </div>
      </section>
    </>
  );
}
