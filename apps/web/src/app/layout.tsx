import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PGA Tour AI",
  description: "Betting, fantasy, and live PGA TOUR intelligence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
