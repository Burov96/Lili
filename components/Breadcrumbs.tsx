import Link from "next/link";
import { breadcrumbJsonLd, JsonLd } from "./JsonLd";

export type Crumb = { name: string; path: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: "Начало", path: "/" }, ...items];
  return (
    <>
      <nav className="breadcrumbs" aria-label="Навигационна пътечка">
        <ol>
          {all.map((c, i) =>
            i === all.length - 1 ? (
              <li key={c.path} aria-current="page">
                {c.name}
              </li>
            ) : (
              <li key={c.path}>
                <Link href={c.path}>{c.name}</Link>
              </li>
            ),
          )}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(all)} />
    </>
  );
}
