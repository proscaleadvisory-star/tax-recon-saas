import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLIENT - Finance Command Layer",
  description:
    "AI-powered finance suite for ecommerce reconciliation, GST, direct tax, profit intelligence and Virtual CFO workflows.",
  keywords: [
    "finance command layer",
    "GST reconciliation",
    "ecommerce reconciliation",
    "direct tax reconciliation",
    "profit cockpit",
    "Virtual CFO",
    "audit evidence",
    "finance automation",
  ],
  authors: [{ name: "CLIENT Finance Suite" }],
  openGraph: {
    title: "CLIENT - Finance Command Layer",
    description:
      "Five AI-powered finance modules in one command layer for reconciliation, tax, profit and CFO operations.",
    type: "website",
  },
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
