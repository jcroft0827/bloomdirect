import type { Metadata } from "next";
import "./globals.css";   // ← must be exactly this (no red squiggly now)

// NO SessionProvider here anymore — we’ll add it only where needed

export const metadata: Metadata = {
  title: "BloomDirect",
  description: "Florists helping florists — no wire fees ever",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}