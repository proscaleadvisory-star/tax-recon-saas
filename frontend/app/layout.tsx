import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProScale Advisory - Finance Command Layer",
  description:
    "ProScale Advisory's AI-powered finance suite for ecommerce reconciliation, GST, direct tax, profit intelligence and Virtual CFO workflows.",
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
  authors: [{ name: "ProScale Advisory" }],
  openGraph: {
    title: "ProScale Advisory - Finance Command Layer",
    description:
      "Five AI-powered finance modules in one command layer for reconciliation, tax, profit and CFO operations.",
    type: "website",
  },
  icons: {
    icon: "/proscale-logo.png",
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
