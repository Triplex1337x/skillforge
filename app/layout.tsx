import type { Metadata } from "next";
import '@fontsource-variable/golos-text';
import "./globals.css";
export const metadata: Metadata = { title: "SKILLFORGE · Игровая аналитика", description: "Личная игровая статистика, тренировки и рейтинг мастерства." };
export default function Layout({ children }: {children: React.ReactNode}) {
  return <html lang="ru"><body>{children}</body></html>;
}
