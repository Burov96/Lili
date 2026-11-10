"use client";

import { site } from "@/lib/config";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container page-head prose" style={{ paddingBlock: "4rem" }}>
      <h1>Страницата не се зареди</h1>
      <p className="lead">
        Опитайте отново след малко. Ако искате да запазите час веднага, обадете се на{" "}
        <a href={`tel:${site.phoneIntl}`} className="nowrap">
          {site.phoneDisplay}
        </a>
        .
      </p>
      <button type="button" className="btn" onClick={reset}>
        Опитай отново
      </button>
    </div>
  );
}
