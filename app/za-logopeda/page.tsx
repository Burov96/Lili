import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CalendarIcon } from "@/components/Decor";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  title: `За логопеда ${site.therapist}`,
  description: `${site.therapist} — логопед, работещ с деца и възрастни с нарушения на речта, езика и комуникацията.`,
  alternates: { canonical: "/za-logopeda" },
};

export default function AboutPage() {
  return (
    <>
      <div className="container page-head">
        <Breadcrumbs items={[{ name: "За логопеда", path: "/za-logopeda" }]} />
        <h1>{site.therapist}</h1>
        <p className="lead prose">Логопед</p>
      </div>
      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container split">
          <div className="prose">
            {/* TODO(Лили): добави образование, опит, квалификации и снимка. */}
            <p>
              {site.therapist} работи с деца и възрастни с нарушения на речта, езика и комуникацията — от
              забавено проговаряне и неправилно изговаряне на звукове до афазии и обучителни трудности.
            </p>
            <p>
              Името на кабинета — „{site.slogan}“ — е и неговият подход. Най-много време детето прекарва
              у дома, затова родителите са част от терапията: след всяко посещение получават насоки и игри,
              с които да продължат заниманията вкъщи.
            </p>
            <p>
              Първата среща е за запознаване и оценка. След нея поставяме конкретни цели и обсъждаме колко
              често е добре да бъдат посещенията.
            </p>
            <p style={{ marginTop: "1.5rem" }}>
              <Link href="/zapazi-chas" className="btn">
                <CalendarIcon />
                Запази час
              </Link>
            </p>
          </div>
          <div style={{ justifySelf: "center", width: "min(22rem, 80vw)" }}>
            <Image src="/logo.png" alt="" width={400} height={346} loading="lazy" sizes="22rem" />
          </div>
        </div>
      </section>
    </>
  );
}
