import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const appSans = Manrope({
  variable: "--font-app-sans",
  subsets: ["latin"],
  display: "swap",
});

const appDisplay = Space_Grotesk({
  variable: "--font-app-display",
  subsets: ["latin"],
  display: "swap",
});

const appMono = JetBrains_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DIME - Data-Driven Innovation",
  description: "Validate your software ideas with data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${appSans.variable} ${appDisplay.variable} ${appMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
