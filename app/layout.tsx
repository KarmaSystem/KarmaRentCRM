import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = { title: "Rental Planner", description: "Управление прокатом и бронированиями" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", userScalable: true };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body><Script src="https://telegram.org/js/telegram-web-app.js?57" strategy="beforeInteractive" />{children}</body></html>; }
