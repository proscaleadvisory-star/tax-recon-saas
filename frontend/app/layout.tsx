import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLIENT Suite - Finance, Tax and Reconciliation Command Layer",
  description:
    "An audit-ready finance suite for GST credits, marketplace payouts, tax evidence, SKU margins and cash flow reconciliation.",
  keywords: [
    "GST reconciliation",
    "e-commerce tax",
    "finance command layer",
    "marketplace reconciliation",
    "audit evidence",
    "direct tax reconciliation",
    "virtual CFO",
    "tax audit",
    "India GST",
  ],
  authors: [{ name: "CLIENT Suite" }],
  openGraph: {
    title: "CLIENT Suite - Finance, Tax and Reconciliation Command Layer",
    description:
      "Audit-ready finance operations for reconciliation, tax evidence and compliance review.",
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
