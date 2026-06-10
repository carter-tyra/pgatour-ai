import type { Metadata } from "next";
import { Geist } from "next/font/google";
import LocalFont from "next/font/local";

import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import "./globals.css";
import { ThemeProvider } from "@/components/utils/theme-provider";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const departureMono = LocalFont({
  src: "../../public/fonts/DepartureMono-Regular.woff",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PGA Tour AI",
  description: "Betting, fantasy, and live PGA TOUR intelligence.",
  icons: {
    apple: "/favicon.svg",
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={cn(geistSans.variable, departureMono.variable, "font-sans antialiased")}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
