import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import SafeClerkProvider from "@/components/safe-clerk-provider";
import { ToastProvider } from "@/components/ui/toast";
import { AppToaster } from "@/components/ui/sonner-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotionProvider } from "@/providers/motion-provider";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import Script from "next/script";
import { BRAND } from "@/lib/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords: [
    "derecho laboral",
    "contratos laborales peru",
    "calculadora laboral",
    "CTS",
    "gratificaciones",
    "liquidación",
    "SUNAFIL",
    "comply360",
  ],
  openGraph: {
    title: `${BRAND.name} — Compliance Laboral Inteligente`,
    description: BRAND.description,
    url: `https://${BRAND.domain}`,
    siteName: BRAND.name,
    locale: "es_PE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — Compliance Laboral Inteligente`,
    description: "Plataforma SaaS de compliance laboral para empresas peruanas.",
  },
  manifest: "/manifest.webmanifest",
  applicationName: BRAND.name,
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#ffffff",
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
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      style={{ colorScheme: 'light' }}
    >
      <head>
        <meta name="color-scheme" content="light only" />
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
          <MotionProvider>
            <TooltipProvider delayDuration={200} skipDelayDuration={300}>
              <ToastProvider>{children}</ToastProvider>
              <AppToaster />
            </TooltipProvider>
          </MotionProvider>
        </SafeClerkProvider>
        <RegisterServiceWorker />
        <InstallPrompt />
      </body>
    </html>
  );
}
