import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Casa",
    template: "%s · Casa",
  },
  description: "Gastos da casa, mês a mês.",
  applicationName: "Casa",
  appleWebApp: {
    capable: true,
    title: "Casa",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1e6b45",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full font-sans" suppressHydrationWarning>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
