import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = { title: "Karma Rent", description: "Управление прокатом и бронированиями", icons: { icon: "/karmarent-logo.png", apple: "/karmarent-logo.png" }, manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", userScalable: false };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body><Script src="https://telegram.org/js/telegram-web-app.js?57" strategy="beforeInteractive" />{children}</body></html>; }
