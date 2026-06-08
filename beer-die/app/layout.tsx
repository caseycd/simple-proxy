import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "BeerDie — Live Stats Tracker",
  description: "Track every throw, catch, and sink. Live scoreboard for beer die.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#080c18] text-slate-100">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
