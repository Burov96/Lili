import type { MetadataRoute } from "next";
import { site } from "@/lib/config";
import { services } from "@/lib/services";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "daily" | "monthly" | "yearly" = "monthly") => ({
    url: `${site.url}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1),
    page("/zapazi-chas", 0.9, "daily"),
    page("/uslugi", 0.8),
    ...services.map((s) => page(`/uslugi/${s.slug}`, 0.7)),
    page("/za-logopeda", 0.6),
    page("/kontakti", 0.6),
    page("/poveritelnost", 0.2, "yearly"),
  ];
}
