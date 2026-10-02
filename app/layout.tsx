import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Rental Planner", description: "Управление прокатом и бронированиями" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body>{children}</body></html>; }
