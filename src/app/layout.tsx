import type { Metadata } from "next";
import { Geist_Mono, Onest, Unbounded } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Аким на 5 часов",
    template: "%s · Аким на 5 часов",
  },
  description:
    "Симулятор управления Астаной: бюджет 100 у.е., пять решений и консилиум AI-экспертов.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${onest.variable} ${unbounded.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
