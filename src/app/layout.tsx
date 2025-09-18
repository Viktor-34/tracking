import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Коммерческие предложения",
  description:
    "Формирование и отслеживание коммерческих предложений с PDF и публичными ссылками",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased bg-slate-50 text-slate-900">
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold text-slate-900">
                КП Трекер
              </Link>
              <nav className="flex items-center gap-4 text-sm text-slate-600">
                <Link
                  href="/proposals/new"
                  className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white transition hover:bg-slate-700"
                >
                  Новое КП
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
