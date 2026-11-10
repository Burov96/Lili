import { booking, site } from "@/lib/config";
import { formatHour } from "@/lib/format";
import { services } from "@/lib/services";

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // < се ескейпва, за да не може съдържанието да затвори тага
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** Структурирани данни за кабинета (LocalBusiness / MedicalBusiness). */
export function businessJsonLd() {
  const { street, city, postalCode, region, country } = site.address;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "@id": `${site.url}/#business`,
    name: site.name,
    alternateName: `Логопед ${site.therapist}`,
    slogan: site.slogan,
    description: site.description,
    url: site.url,
    telephone: site.phoneIntl,
    image: `${site.url}/og.jpg`,
    logo: `${site.url}/logo.png`,
    inLanguage: "bg",
    medicalSpecialty: "SpeechPathology",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: formatHour(booking.firstHour),
        closes: formatHour(booking.lastHour + 1),
      },
    ],
    employee: {
      "@type": "Person",
      name: site.therapist,
      jobTitle: site.jobTitle,
    },
    knowsAbout: services.map((s) => s.title),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Логопедични услуги",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.title, url: `${site.url}/uslugi/${s.slug}` },
      })),
    },
    potentialAction: {
      "@type": "ReserveAction",
      target: `${site.url}/zapazi-chas`,
      name: "Запази час",
    },
  };
  if (site.email) data.email = site.email;
  if (city || street) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: street || undefined,
      addressLocality: city || undefined,
      postalCode: postalCode || undefined,
      addressRegion: region || undefined,
      addressCountry: country,
    };
    if (city) data.areaServed = city;
  }
  if (site.geo) {
    data.geo = { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng };
  }
  return data;
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${site.url}${it.path}`,
    })),
  };
}
