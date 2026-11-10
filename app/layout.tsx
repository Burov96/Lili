import type { Metadata, Viewport } from "next";
import { Marck_Script, Nunito } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { site } from "@/lib/config";
import "./globals.css";

const nunito = Nunito({
  subsets: ["cyrillic", "latin"],
  variable: "--font-nunito",
  display: "swap",
});

const marck = Marck_Script({
  subsets: ["cyrillic", "latin"],
  weight: "400",
  variable: "--font-marck",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `Логопед ${site.therapist} | ${site.name}`,
    template: `%s | Логопед ${site.therapist}`,
  },
  description: site.description,
  applicationName: site.shortName,
  authors: [{ name: site.therapist }],
  keywords: [
    "логопед",
    "логопедичен кабинет",
    "логопед за деца",
    "забавено проговаряне",
    "дислалия",
    "артикулационни нарушения",
    "афазия",
    "аутизъм",
    "деца със СОП",
    "дислексия",
    "обучителни трудности",
    site.therapist,
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: "/",
    siteName: site.name,
    title: `Логопед ${site.therapist} — ${site.slogan}`,
    description: site.description,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Логопед ${site.therapist} — ${site.slogan}`,
    description: site.description,
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: "#fdfdf1",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" className={`${nunito.variable} ${marck.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Към съдържанието
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
