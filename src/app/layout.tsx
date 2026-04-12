import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SafeClerkProvider from "@/components/safe-clerk-provider";
import { ToastProvider } from "@/components/ui/toast";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "COMPLY360 — Plataforma Legal Inteligente",
    template: "%s | COMPLY360",
  },
  description:
    "Plataforma SaaS para gestión de contratos laborales, cálculos de beneficios sociales y alertas normativas. Derecho laboral peruano con IA.",
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
  manifest: "/manifest.webmanifest",
  applicationName: "COMPLY360",
  appleWebApp: {
    capable: true,
    title: "COMPLY360",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#facc15",
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
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-[#0f172a] text-slate-200">
        <SafeClerkProvider>
          <ToastProvider>{children}</ToastProvider>
        </SafeClerkProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
