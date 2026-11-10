import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container page-head prose" style={{ paddingBlock: "4rem" }}>
      <h1>Страницата не е намерена</h1>
      <p className="lead">Адресът може да е сгрешен или страницата да е преместена.</p>
      <div className="hero__actions">
        <Link href="/" className="btn">
          Към началото
        </Link>
        <Link href="/zapazi-chas" className="btn btn--ghost">
          Запази час
        </Link>
      </div>
    </div>
  );
}
