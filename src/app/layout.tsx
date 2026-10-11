import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Plus_Jakarta_Sans, Fira_Code } from "next/font/google";
import "./globals.css";
import SafeClerkProvider from "@/components/safe-clerk-provider";
import { ToastProvider } from "@/components/ui/toast";
import { AppToaster } from "@/components/ui/sonner-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotionProvider } from "@/providers/motion-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import Script from "next/script";
import { BRAND } from "@/lib/brand";

const faviconVersion = "20260511-2";
// Verificación de Search Console para la propiedad https://comply360.pe/. Si se
// borra, Google deja de considerar verificado el sitio. No es un secreto.
const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "7CezB-bjQCibqzmBxcpB5TwWblXoD8OwLdM0jWpEehM";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Plus Jakarta Sans — sans principal para SaaS B2B profesional.
// Recomendación del UI/UX Pro Max para dashboards/compliance.
// Mejor jerarquía y legibilidad en headers que Geist (más neutra).
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

// Fira Code — mono para datos numéricos, hora, scores, currency.
// Tabular figures por default + ligaduras desactivadas en uso UI.
const firaCode = Fira_Code({
  variable: "--font-fira",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Editorial serif — usada en hero numbers (score 88px) y headlines críticos.
// Expone --font-instrument-serif, consumido por --font-serif en tokens.css.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

// Metadata del sitio público del estudio (oct-2026). Cada página define su
// título corto; la plantilla agrega " | Comply360".
const SITE_TITLE = "Comply360 | Cumplimiento laboral y SST para empresas en Perú";
const SITE_DESCRIPTION =
  "Estudio de cumplimiento normativo para empresas: laboral, SST, hostigamiento sexual y capacitaciones obligatorias, con la evidencia lista para SUNAFIL. Trujillo y todo el Perú.";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${BRAND.domain}`),
  title: {
    default: SITE_TITLE,
    template: "%s | Comply360",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "cumplimiento laboral",
    "seguridad y salud en el trabajo",
    "capacitaciones obligatorias SST",
    "hostigamiento sexual empresas",
    "SUNAFIL",
    "Trujillo",
    "comply360",
  ],
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: `https://${BRAND.domain}`,
    siteName: "Comply360",
    locale: "es_PE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: `/favicon-32.png?v=${faviconVersion}`, sizes: "32x32", type: "image/png" },
      { url: `/favicon.svg?v=${faviconVersion}`, type: "image/svg+xml" },
      { url: `/favicon.ico?v=${faviconVersion}`, sizes: "any", type: "image/x-icon" },
      { url: `/icon-192.png?v=${faviconVersion}`, sizes: "192x192", type: "image/png" },
      { url: `/icon-512.png?v=${faviconVersion}`, sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: `/favicon.ico?v=${faviconVersion}`, type: "image/x-icon" }],
    apple: [{ url: `/apple-touch-icon.png?v=${faviconVersion}`, sizes: "180x180", type: "image/png" }],
  },
  applicationName: BRAND.name,
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#f4f8ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-PE"
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} ${firaCode.variable} ${instrumentSerif.variable} h-full antialiased`}
      style={{ colorScheme: 'light' }}
    >
      <head>
        <meta name="color-scheme" content="light" />
        {/* Plausible analytics — GDPR-friendly, sin cookies. Condicional:
            solo se carga si NEXT_PUBLIC_PLAUSIBLE_DOMAIN está configurado. */}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ? (
          <>
            <Script
              defer
              data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
              src={
                process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ??
                'https://plausible.io/js/script.tagged-events.js'
              }
              strategy="afterInteractive"
            />
            {/* Habilita window.plausible('event', {props}) */}
            <Script id="plausible-init" strategy="afterInteractive">
              {`window.plausible = window.plausible || function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}`}
            </Script>
          </>
        ) : null}
      </head>
      <body className="min-h-full bg-[color:var(--bg-canvas)] text-[color:var(--text-primary)]">
        <SafeClerkProvider>
          <I18nProvider>
            <MotionProvider>
              <TooltipProvider delayDuration={200} skipDelayDuration={300}>
                <ToastProvider>{children}</ToastProvider>
                <AppToaster />
              </TooltipProvider>
            </MotionProvider>
          </I18nProvider>
        </SafeClerkProvider>
        <RegisterServiceWorker />
        <InstallPrompt />
      </body>
    </html>
  );
}
