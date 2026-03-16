import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientRuntime from "@/components/ClientRuntime";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NUUL — Protect Your Photos",
  description:
    "Local-first privacy protection for your photos. Strip metadata, blur sensitive data, and export safely. No uploads, no accounts required.",
  keywords: ["privacy", "photo", "metadata", "security", "local-first", "image protection"],
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dreamy" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ClientRuntime />
        {children}
      </body>
    </html>
  );
}
